#!/usr/bin/env bun
/**
 * Daily Schedule Healthcheck
 *
 * 每天 11:00 AEST 跑一次，扫今天的 scheduled content 是不是齐了。
 *
 * 检查：
 *   1. ai-daily JSON + blog md + 2 个 HTML
 *   2. uni-news：今天必须有 2 校（任意 2 校）的 JSON + 4 个产物
 *               (2026-04-29 改为 2 校 · routine 选 2 + self-heal 补 0~1 = 2-3 校/天)
 *   3. uni-events：只在周日检（DATE = 下周一的 JSON）
 *   4. it-daily：每天 1 篇 blog md (2026-05-05 加)
 *   5. weekly-holidays：只在周日检 latest.json mtime = 今天 (2026-05-05 加)
 *
 * 用法：bun run scripts/daily-schedule-healthcheck.ts [YYYY-MM-DD]
 *      不传日期 → 用今天的 AEST 日期
 *
 * 退出码：
 *   0 = 全部 OK
 *   1 = 有缺档（routine 日志会显示 ❌，运营人能看到）
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function aestDate(): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Australia/Sydney',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(new Date());
}

function aestDayOfWeek(dateStr: string): number {
	// 0=Sun, 1=Mon, ..., 6=Sat — 把 YYYY-MM-DD 当成日历日期，不带时区漂移
	return new Date(dateStr + 'T00:00:00Z').getUTCDay();
}

function nextMonday(dateStr: string): string {
	const d = new Date(dateStr + 'T00:00:00Z');
	const dow = d.getUTCDay();
	const daysToAdd = ((8 - dow) % 7) || 7;
	d.setUTCDate(d.getUTCDate() + daysToAdd);
	return d.toISOString().slice(0, 10);
}

function exists(rel: string): boolean {
	return fs.existsSync(path.join(ROOT, rel));
}

const DATE = process.argv[2] || aestDate();
const dow = aestDayOfWeek(DATE);
const dowName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow];

console.log(`▶ Healthcheck ${DATE} (${dowName} AEST)`);
console.log('');

const issues: string[] = [];
const warnings: string[] = [];

// ─────────────────────────────────────────────────────────────
// Check 1: AI Daily News
// ─────────────────────────────────────────────────────────────
console.log('━━━ AI Daily News ━━━');

const aiDailyChecks = [
	`src/data/ai-daily/${DATE}.json`,
	`src/content/articles/ai-daily-${DATE}.md`,
	`src/static/ai-news-posters/${DATE}/index.html`,
	`src/static/ai-news-posters/${DATE}/mp-article.html`,
];

let aiOk = true;
for (const f of aiDailyChecks) {
	if (exists(f)) {
		console.log(`  ✅ ${f}`);
	} else {
		console.log(`  ❌ 缺 ${f}`);
		issues.push(`AI Daily 缺 ${f}`);
		aiOk = false;
	}
}
if (aiOk) console.log('  → AI Daily routine 产出完整');
console.log('');

// ─────────────────────────────────────────────────────────────
// Check 2: Uni News (今天必须有 2 校 · 任意 2 所核心 6 校 · 2026-04-29 改)
// ─────────────────────────────────────────────────────────────
const MIN_SCHOOLS = 2;
console.log(`━━━ Uni News (${MIN_SCHOOLS} 校轮换 · 核心 6 校) ━━━`);

const SCHOOLS = ['uq', 'umelb', 'unsw', 'usyd', 'monash', 'anu', 'adelaide', 'rmit', 'uts', 'uwa'];
const todaySchools = SCHOOLS.filter(s => exists(`src/data/uni-news/${s}/${DATE}.json`));

if (todaySchools.length === 0) {
	console.log(`  ❌ 今天 0 校产了（应该 ≥${MIN_SCHOOLS} 校）`);
	issues.push(`Uni News 0 校 — routine 完全没跑或全失败`);
} else if (todaySchools.length < MIN_SCHOOLS) {
	console.log(`  ⚠️  今天只有 ${todaySchools.length} 校（${todaySchools.join('/')}），少于 ${MIN_SCHOOLS}`);
	warnings.push(`Uni News 只有 ${todaySchools.length} 校（${todaySchools.join('/')}）`);
} else {
	console.log(`  ✅ 今天 ${todaySchools.length} 校：${todaySchools.join(' / ')}（≥${MIN_SCHOOLS} OK）`);
}

// 每校检 4 产物
for (const s of todaySchools) {
	const checks = [
		`src/static/uni-news-social/${DATE}/${s}/xhs-posters.html`,
		`src/static/uni-news-social/${DATE}/${s}/mp-article.html`,
		`src/static/uni-news-social/${DATE}/${s}/xhs-drafts.md`,
		`src/content/articles/uni-news-${s}-${DATE}.md`,
	];
	const missing = checks.filter(f => !exists(f));
	if (missing.length === 0) {
		console.log(`     ✅ ${s} 4 产物齐`);
	} else {
		for (const m of missing) {
			console.log(`     ❌ ${s} 缺 ${m}`);
			issues.push(`${s} 缺 ${m}`);
		}
	}
}

// hub 是否包含今天（rebuild-uni-hub 生成 MM-DD 格式，如 05-23）
const hubFile = 'src/static/uni-news-social/index.html';
if (exists(hubFile)) {
	const hub = fs.readFileSync(path.join(ROOT, hubFile), 'utf8');
	const mmdd = DATE.slice(5); // "2026-05-23" → "05-23"
	if (todaySchools.length > 0 && !hub.includes(mmdd)) {
		console.log(`  ⚠️  hub index.html 没引用今天 ${mmdd}（rebuild-uni-hub 没跑？）`);
		warnings.push(`hub 没 rebuild`);
	} else if (todaySchools.length > 0) {
		console.log(`  ✅ hub index.html 包含 ${mmdd}`);
	}
}
console.log('');

// ─────────────────────────────────────────────────────────────
// Check 3: IT Daily News (每天 1 篇 blog md)
// ─────────────────────────────────────────────────────────────
console.log('━━━ IT Daily News ━━━');

const itDailyFile = `src/content/articles/it-daily-${DATE}.md`;
if (exists(itDailyFile)) {
	console.log(`  ✅ ${itDailyFile}`);
} else {
	console.log(`  ❌ 缺 ${itDailyFile}`);
	issues.push(`IT Daily 缺 ${itDailyFile}`);
}
console.log('');

// ─────────────────────────────────────────────────────────────
// Check 4: Uni Events (周日检 · DATE = 下周一)
// ─────────────────────────────────────────────────────────────
console.log('━━━ Uni Events (周日产下周一预告) ━━━');

if (dow === 0) {
	const nextMon = nextMonday(DATE);
	const eventsChecks = [
		`src/data/uni-events/${nextMon}.json`,
		`src/static/uni-news-social/events/${nextMon}.html`,
		`src/static/uni-news-social/events/${nextMon}-covers.html`,
	];
	let eventsOk = true;
	for (const f of eventsChecks) {
		if (exists(f)) {
			console.log(`  ✅ ${f}`);
		} else {
			console.log(`  ❌ 缺 ${f}`);
			issues.push(`Uni Events 缺 ${f}`);
			eventsOk = false;
		}
	}
	if (eventsOk) console.log(`  → 下周一 ${nextMon} 活动预告产出完整`);
} else {
	console.log(`  ⏭️  非周日，跳过（uni-events 改成每周日跑一次产下周预告）`);
}
console.log('');

// ─────────────────────────────────────────────────────────────
// Check 5: Weekly Holidays (周日检 · latest.json mtime = 今天 AEST)
// ─────────────────────────────────────────────────────────────
console.log('━━━ Weekly Holidays (周日刷新 latest.json) ━━━');

if (dow === 0) {
	const dailyFile = `src/data/weekly-holidays/${DATE}.json`;
	const latestFile = `src/data/weekly-holidays/latest.json`;
	if (exists(dailyFile)) {
		console.log(`  ✅ ${dailyFile}`);
	} else {
		console.log(`  ❌ 缺 ${dailyFile}`);
		issues.push(`Weekly Holidays 缺 ${dailyFile}`);
	}
	if (exists(latestFile)) {
		const mtime = fs.statSync(path.join(ROOT, latestFile)).mtime;
		const mtimeAest = new Intl.DateTimeFormat('en-CA', {
			timeZone: 'Australia/Sydney',
			year: 'numeric', month: '2-digit', day: '2-digit',
		}).format(mtime);
		if (mtimeAest === DATE) {
			console.log(`  ✅ latest.json mtime = ${DATE} (今天刷新过)`);
		} else {
			console.log(`  ⚠️  latest.json mtime = ${mtimeAest} (期望 ${DATE})`);
			warnings.push(`Weekly Holidays latest.json 没刷新 (mtime=${mtimeAest})`);
		}
	} else {
		console.log(`  ❌ 缺 ${latestFile}`);
		issues.push(`Weekly Holidays 缺 ${latestFile}`);
	}
} else {
	console.log(`  ⏭️  非周日，跳过（weekly-holidays 周日 09:00 AEST 跑）`);
}
console.log('');

// ─────────────────────────────────────────────────────────────
// 汇总
// ─────────────────────────────────────────────────────────────
console.log('━━━ 汇总 ━━━');
console.log(`日期: ${DATE} (${dowName})`);
console.log(`错误: ${issues.length}`);
console.log(`警告: ${warnings.length}`);

if (issues.length > 0) {
	console.log('');
	console.log('❌ 缺档清单：');
	issues.forEach(i => console.log(`  - ${i}`));
	console.log('');
	console.log('修复方法：');
	console.log('  1. 本地 cd jr-wiki');
	console.log(`  2. /ai-daily-news ${DATE}        # 补 AI 日报`);
	console.log(`  3. /uni-news-poster ${DATE}     # 补大学新闻（自动选 2 校）`);
	console.log(`  4. /it-daily-news ${DATE}        # 补 IT 认证日报`);
	let nextStep = 5;
	if (dow === 0) {
		console.log(`  ${nextStep++}. /uni-events                  # 补下周活动预告`);
		console.log(`  ${nextStep++}. /weekly-holidays             # 补节假日 latest.json`);
	}
	console.log(`  ${nextStep++}. git push`);
	console.log(`  ${nextStep}. 上 https://claude.ai/code/scheduled 看 routine 日志找根因`);
	process.exit(1);
}

if (warnings.length > 0) {
	console.log('');
	console.log('⚠️  警告（不阻塞但要看）：');
	warnings.forEach(w => console.log(`  - ${w}`));
}

console.log('');
console.log(`✅ 今天所有 scheduled content 都齐了`);
process.exit(0);
