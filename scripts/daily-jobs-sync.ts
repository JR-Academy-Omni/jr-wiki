#!/usr/bin/env bun
/**
 * Daily Jobs Sync — push curated daily-pick jobs to jr-academy backend.
 *
 * Triggered by GitHub Actions on push to src/data/daily-jobs/**.
 * Reads JSON files, calls bulk-daily-picks (creates Job records),
 * then for each returned jobId calls ai-tutor/job-analysis/job (creates SavedJobAnalysis with isPublic=true).
 *
 * Usage:
 *   bun run scripts/daily-jobs-sync.ts                    # sync all today's files
 *   bun run scripts/daily-jobs-sync.ts <bootcamp> <date>  # sync one specific file
 *   bun run scripts/daily-jobs-sync.ts --files=path1,path2,path3
 *
 * Env:
 *   JR_ADMIN_TOKEN   (required) — bearer token for /admin-cms/* and /ai-tutor/*
 *   JR_API           (optional) — API base, defaults to https://api.jiangren.com.au
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = process.env.JR_API || 'https://api.jiangren.com.au';
// Prefer JR_SERVICE_API_KEY (long-lived service-account, jrak_xxx);
// fall back to JR_ADMIN_TOKEN / ADMIN_TOKEN for legacy compat.
const TOKEN =
	process.env.JR_SERVICE_API_KEY ||
	process.env.JR_ADMIN_TOKEN ||
	process.env.ADMIN_TOKEN ||
	'';

if (!TOKEN) {
	console.error(
		'::error::JR_SERVICE_API_KEY (preferred), JR_ADMIN_TOKEN, or ADMIN_TOKEN env var is required.'
	);
	process.exit(1);
}
console.log(`▶ token length=${TOKEN.length} api=${API}`);

interface DailyJob {
	tier: 'aspirational' | 'actionable' | 'special';
	tierLabel?: string;
	title: string;
	company: string;
	location: string;
	posted?: string;
	url: string;
	why: string;
	// Routine WebFetch 抓的 LinkedIn JD 原文（responsibilities/requirements/tech stack/benefits）
	// 1500-5000 字 markdown。WebFetch 失败时为 ""。
	description?: string;
}

interface DailyJobsFile {
	bootcamp: string;
	date: string;
	cohort?: string;
	generatedAt?: string;
	source?: string;
	jobs: DailyJob[];
	alternativeCandidates?: DailyJob[];
}

function aestDate(): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Australia/Sydney',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	})
		.format(new Date())
		.replace(/\//g, '-');
}

function platformFromUrl(url: string): string {
	if (url.includes('linkedin.com')) return 'linkedin';
	if (url.includes('seek.com.au')) return 'seek';
	if (url.includes('indeed.com')) return 'indeed';
	if (url.includes('glassdoor')) return 'glassdoor';
	if (url.includes('gradconnection')) return 'gradconnection';
	return 'manual';
}

async function postJSON(endpoint: string, body: unknown): Promise<{ status: number; data: any }> {
	const url = `${API}${endpoint}`;
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${TOKEN}`,
		},
		body: JSON.stringify(body),
	});
	const text = await res.text();
	let data: any = null;
	try {
		data = text ? JSON.parse(text) : null;
	} catch {
		data = { raw: text };
	}
	return { status: res.status, data };
}

async function syncFile(filePath: string): Promise<{ ok: boolean; bootcamp: string; date: string; created: number; analyzed: number; analyzeFailed: number }> {
	console.log(`\n▶ Sync ${filePath}`);
	const raw = fs.readFileSync(filePath, 'utf-8');
	const file = JSON.parse(raw) as DailyJobsFile;

	if (!file.bootcamp || !file.date || !Array.isArray(file.jobs) || file.jobs.length === 0) {
		console.log('  ⚠️  invalid or empty file, skip');
		return { ok: false, bootcamp: file.bootcamp || '?', date: file.date || '?', created: 0, analyzed: 0, analyzeFailed: 0 };
	}

	// Step 1: bulk-daily-picks
	const bulkPayload = {
		bootcampSlug: file.bootcamp,
		date: file.date,
		skillVersion: 'v1.0-sync',
		jobs: file.jobs.map((j) => ({
			tier: j.tier,
			title: j.title,
			location: j.location,
			companyName: j.company,
			postedAgo: j.posted,
			applyUrl: j.url,
			whyForLearners: j.why,
		})),
	};

	const bulkResp = await postJSON('/admin-cms/jobs/bulk-daily-picks', bulkPayload);
	if (bulkResp.status !== 200 && bulkResp.status !== 201) {
		const errSnippet = JSON.stringify(bulkResp.data).slice(0, 500).replace(/\n/g, ' ');
		console.error(`::error::bulk-daily-picks HTTP ${bulkResp.status} bootcamp=${file.bootcamp} body=${errSnippet}`);
		return { ok: false, bootcamp: file.bootcamp, date: file.date, created: 0, analyzed: 0, analyzeFailed: 0 };
	}

	const created: number = bulkResp.data?.data?.created ?? 0;
	const jobIds: string[] = bulkResp.data?.data?.jobIds ?? [];
	console.log(`  ✅ bulk-daily-picks created=${created} jobIds=${jobIds.length}`);

	// Step 2: per-job analyze (writes SavedJobAnalysis with isPublic=true → slug + publishedAt auto-generated)
	let analyzed = 0;
	let analyzeFailed = 0;

	for (let i = 0; i < jobIds.length; i++) {
		const job = file.jobs[i];
		const jobId = jobIds[i];
		if (!job || !jobId) continue;

		// 优先用 routine 抓到的 LinkedIn JD 原文（job.description）
		// fallback 到 metadata 一句话（老数据 / WebFetch 失败时）
		const fullJD = job.description && job.description.length > 200
			? `${job.description}\n\n--- 为什么对 Bootcamp 学员有价值 ---\n${job.why}`
			: `${job.title} at ${job.company} (${job.location}). ${job.why}`;

		const analyzePayload = {
			jobTitle: job.title,
			companyName: job.company,
			location: job.location,
			jobDescription: fullJD,
			sourceUrl: job.url,
			sourcePlatform: platformFromUrl(job.url),
			sourceId: jobId,
			isPublic: true,
		};

		const aResp = await postJSON('/ai-tutor/job-analysis/job', analyzePayload);
		if (aResp.status === 200 || aResp.status === 201) {
			const slug = aResp.data?.data?.slug || aResp.data?.data?.id || '?';
			console.log(`  ✅ analyze [${i + 1}/${jobIds.length}] ${job.title} → ${slug}`);
			analyzed++;
		} else {
			console.error(`  ⚠️  analyze [${i + 1}/${jobIds.length}] HTTP ${aResp.status} jobId=${jobId}`);
			console.error(`      ${JSON.stringify(aResp.data).slice(0, 300)}`);
			analyzeFailed++;
		}

		// gentle pacing to avoid LLM rate limits
		await new Promise((r) => setTimeout(r, 1000));
	}

	console.log(`  Summary: created=${created} analyzed=${analyzed} failed=${analyzeFailed}`);
	return { ok: true, bootcamp: file.bootcamp, date: file.date, created, analyzed, analyzeFailed };
}

function resolveTargetFiles(args: string[]): string[] {
	const filesArg = args.find((a) => a.startsWith('--files='));
	if (filesArg) {
		return filesArg
			.slice('--files='.length)
			.split(',')
			.map((p) => p.trim())
			.filter(Boolean)
			.map((p) => path.resolve(ROOT, p));
	}

	const positional = args.filter((a) => !a.startsWith('--'));
	if (positional.length === 2) {
		const [bootcamp, date] = positional;
		return [path.resolve(ROOT, 'src/data/daily-jobs', bootcamp, `${date}.json`)];
	}

	// Default: scan all today's bootcamps
	const today = aestDate();
	const baseDir = path.resolve(ROOT, 'src/data/daily-jobs');
	if (!fs.existsSync(baseDir)) return [];
	const out: string[] = [];
	for (const bc of fs.readdirSync(baseDir, { withFileTypes: true })) {
		if (!bc.isDirectory()) continue;
		const candidate = path.join(baseDir, bc.name, `${today}.json`);
		if (fs.existsSync(candidate)) out.push(candidate);
	}
	return out;
}

async function main() {
	const args = process.argv.slice(2);
	const targets = resolveTargetFiles(args);

	if (targets.length === 0) {
		console.log('No daily-jobs files to sync (target list empty).');
		process.exit(0);
	}

	console.log(`▶ Syncing ${targets.length} file(s) to ${API}`);

	const results: Awaited<ReturnType<typeof syncFile>>[] = [];
	for (const f of targets) {
		if (!fs.existsSync(f)) {
			console.error(`  ⚠️  not found: ${f}`);
			continue;
		}
		try {
			results.push(await syncFile(f));
		} catch (err) {
			console.error(`  ❌ error syncing ${f}:`, err);
			results.push({ ok: false, bootcamp: '?', date: '?', created: 0, analyzed: 0, analyzeFailed: 0 });
		}
	}

	const totalCreated = results.reduce((s, r) => s + r.created, 0);
	const totalAnalyzed = results.reduce((s, r) => s + r.analyzed, 0);
	const totalFailed = results.reduce((s, r) => s + r.analyzeFailed, 0);
	const allOk = results.every((r) => r.ok);

	console.log(`\n=== Sync complete ===`);
	console.log(`Files: ${results.length}, jobs created: ${totalCreated}, analyses ok: ${totalAnalyzed}, analyses failed: ${totalFailed}`);

	if (!allOk) {
		console.error('❌ Some files failed to sync (see above).');
		process.exit(1);
	}
}

main().catch((err) => {
	console.error('Unhandled error:', err);
	process.exit(1);
});
