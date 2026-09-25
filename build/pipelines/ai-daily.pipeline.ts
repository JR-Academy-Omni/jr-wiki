/**
 * AI Daily pipeline
 *
 * 读 src/data/ai-daily/{DATE}.json → 生成
 *   1. src/static/ai-news-posters/{DATE}/index.html       (XHS poster 薄壳，引 poster-renderer.v2.js)
 *   2. src/static/ai-news-posters/{DATE}/mp-article.html  (公众号薄壳，引 mp-inline.v1.js + mp-page.v1.css)
 *
 * 用法：
 *   bun build/pipelines/ai-daily.pipeline.ts                  # 全量构建
 *   bun build/pipelines/ai-daily.pipeline.ts 2026-04-23       # 指定日期
 *   bun build/pipelines/ai-daily.pipeline.ts 2026-04-23 --force  # 覆盖非 pipeline 产物（小心）
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import {
	htmlEscape,
	tokensToPlainText,
	srcStringToLinks,
	loadJson,
	loadTemplate,
	renderTemplate,
	canWriteOrSkip,
	writeWithMarker,
	type TextToken,
} from './_shared';

const REPO_ROOT = join(dirname(new URL(import.meta.url).pathname), '..', '..');
const DATA_DIR = join(REPO_ROOT, 'src/data/ai-daily');
const ARTICLES_DIR = join(REPO_ROOT, 'src/content/articles');
const TEMPLATE_POSTER = join(REPO_ROOT, 'src/templates/xhs-poster/ai-daily.template.html');
const TEMPLATE_MP = join(REPO_ROOT, 'src/templates/mp-article/ai-daily.template.html');
const OUTPUT_BASE = join(REPO_ROOT, 'src/static/ai-news-posters');

const AI_DAILY_BRAND = {
	primary: '#ff5757',
	highlight: '#ffce44',
	dark: '#10162f',
	onDark: '#ffffff',
};

interface NewsBullet { k: string; v: string; }
interface NewsItem {
	slug: string;
	idx: string;
	catText: string;
	accent: string;
	title: TextToken[];
	oneline: TextToken[];
	bullets: NewsBullet[];
	src: string;
	mp?: {
		h2?: string;
		paragraphs?: string[];
		sourceHtml?: string;
		posterImage?: string;
		altImage?: string;
		altAlt?: string;
	};
	[k: string]: unknown;
}

interface AiDailyData {
	schemaVersion?: string;
	date: string;
	theme?: string;
	articleUrl?: string;
	summary: {
		hook: TextToken[];
		items: Array<{ num: string; cat: string; t: string; numColor?: string }>;
		sub?: string;
	};
	news: NewsItem[];
	mp?: {
		title?: string;
		lead?: string;
		meta?: { author?: string; readTime?: string };
		quickview?: { title?: string; items?: string[] };
		cta?: { big?: string; sub?: string };
	};
}

function validate(data: unknown, file: string): asserts data is AiDailyData {
	if (!data || typeof data !== 'object') throw new Error(`${file}: not a JSON object`);
	const d = data as Record<string, unknown>;
	if (typeof d.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
		throw new Error(`${file}: invalid or missing "date"`);
	}
	if (!d.summary || typeof d.summary !== 'object') throw new Error(`${file}: missing "summary"`);
	if (!Array.isArray(d.news) || d.news.length < 3 || d.news.length > 7) {
		throw new Error(`${file}: "news" must have 3-7 items (got ${Array.isArray(d.news) ? d.news.length : 'non-array'})`);
	}
}

/* =========================== Oneline tokens → HTML =========================== */

function onelineToHtml(tokens: TextToken[]): string {
	if (!Array.isArray(tokens)) return '';
	return tokens
		.map(t => {
			const text = htmlEscape(t.text || '');
			if (t.bold) return `<strong>${text}</strong>`;
			return text;
		})
		.join('');
}

/* =========================== Auto-derive helpers =========================== */

/** 5 items from summary → quickview list (HTML) */
function deriveQuickviewItems(data: AiDailyData): string[] {
	return data.summary.items.map(it => {
		const cat = htmlEscape(it.cat);
		const title = htmlEscape(it.t);
		return `<strong>${cat}</strong>：${title}`;
	});
}

/** 3 bullets → 3 paragraphs (with bold-prefixed key) */
function bulletsToParagraphs(bullets: NewsBullet[]): string[] {
	return bullets.map(b => {
		const k = htmlEscape(b.k);
		const v = htmlEscape(b.v);
		return `<strong>${k}</strong>：${v}`;
	});
}

/* =========================== Parse paragraphs from .md ===========================
 * 从 src/content/articles/ai-daily-{DATE}.md 解析每条 news 的 3 段正文。
 * 这样 agent 不必在 JSON 里重复写 mp.newsBodies，省 ~10KB → 规避 stream timeout。
 *
 * 期望 .md 结构（按当前 skill）：
 *   ## 1. {title}
 *   ![alt](image)
 *   **一句话**: ...
 *   段落 1
 *   段落 2
 *   段落 3
 *   > 来源: [name](url) · ...
 *   ---
 *   ## 2. {title}
 *   ...
 *
 * 返回 Map<idx 数字, paragraphs[]>（如 1 → [段落 1, 段落 2, 段落 3]）
 */
function parseArticleParagraphs(date: string): Map<number, string[]> {
	const result = new Map<number, string[]>();
	const mdPath = join(ARTICLES_DIR, `ai-daily-${date}.md`);
	if (!existsSync(mdPath)) return result;

	const md = readFileSync(mdPath, 'utf-8');
	// 跳过 frontmatter
	const body = md.replace(/^---\n[\s\S]*?\n---\n?/, '');

	// 按 ## N. 分割成 sections（N 是数字）
	const sections = body.split(/^## (\d+)\. /m);
	// 第一个分片是开头杂物，从 [1] 开始 [num, content, num, content, ...]
	for (let i = 1; i < sections.length; i += 2) {
		const idx = Number(sections[i]);
		const content = sections[i + 1] || '';
		// 提取「**一句话**: 后面 + 「> 来源:」前面」之间的所有段落
		const onelineMatch = content.match(/\*\*一句话\*\*[:：][^\n]*\n+([\s\S]*?)(?=\n>\s*来源|\n---\n|$)/);
		if (!onelineMatch) continue;
		const between = onelineMatch[1];
		// 拆段（双换行）+ 过滤掉 image / 空行
		const paras = between
			.split(/\n\n+/)
			.map(p => p.trim())
			.filter(p => p && !p.startsWith('![') && !p.startsWith('>'));
		if (paras.length > 0) result.set(idx, paras);
	}

	return result;
}

/* =========================== Render article content =========================== */

function renderArticleContent(data: AiDailyData): { html: string; charCount: number } {
	const mp = data.mp || {};
	const title = mp.title || `AI 日报 ${data.date}`;
	// 从 .md 文件 parse 每条 news 的深度段落（agent 可以省 mp.newsBodies）
	const mdParagraphs = parseArticleParagraphs(data.date);
	// lead fallback: 用 .md 第一句话作为 lead 起头会更自然
	const lead = mp.lead || `${data.date} AI 日报，今日 ${data.news.length} 条：${data.summary.items.map(i => i.t).join('；')}。`;
	const author = mp.meta?.author || 'JR Academy AI 日报';
	const readTime = mp.meta?.readTime || '8 分钟';
	const quickview = mp.quickview || {};
	const qvTitle = quickview.title || '📌 今日速览';
	const qvItems = quickview.items || deriveQuickviewItems(data);
	const cta = mp.cta || {};
	const ctaBig = cta.big || '🎯 想每天 9 点收到 AI 日报？';
	const ctaSub = cta.sub || '关注 JR Academy 公众号 · 回复「AI 日报」自动订阅<br>官网 jiangren.com.au/blog · 历史日报全开放';

	const parts: string[] = [];

	parts.push(`<div class="mp-title">${htmlEscape(title)}</div>`);
	parts.push(`<div class="mp-meta">`);
	parts.push(`  <span class="author">${htmlEscape(author)}</span>`);
	parts.push(`  <span>·</span><span>${htmlEscape(data.date)}</span>`);
	parts.push(`  <span>·</span><span>阅读约 ${htmlEscape(readTime)}</span>`);
	parts.push(`</div>`);
	parts.push(`<div class="mp-lead">${lead}</div>`);

	// Summary poster (poster-0)
	parts.push(`<img class="mp-img" src="./poster-0.png" alt="图 1 · 合集海报" data-poster="poster-0" data-file="mp-01-summary.png">`);
	parts.push(`<div class="mp-caption">图 1 · 合集海报</div>`);
	parts.push(`<hr class="mp-divider">`);

	data.news.forEach((n, i) => {
		const nmp = n.mp || {};
		const h2 = nmp.h2 || tokensToPlainText(n.title);
		// 段落 fallback 链：1) JSON 显式给 mp.paragraphs 2) .md 文件 parse 出的深度段
		// 3) bullets 拼接（最差，提纲风格）
		const idxNum = Number(n.idx);
		const fromMd = mdParagraphs.get(idxNum);
		const paragraphs = nmp.paragraphs || (fromMd && fromMd.length > 0 ? fromMd : bulletsToParagraphs(n.bullets));
		const sourceHtml = nmp.sourceHtml || srcStringToLinks(n.src);
		const posterImage = nmp.posterImage || `./poster-${i + 1}.png`;

		parts.push(`<div class="mp-hook">${htmlEscape(n.idx)} · ${htmlEscape(n.catText)}</div>`);
		parts.push(`<div class="mp-h2">${htmlEscape(h2)}</div>`);
		parts.push(`<img class="mp-img" src="${htmlEscape(posterImage)}" alt="图 ${i + 2} · 海报 ${n.idx}" data-poster="poster-${i + 1}" data-file="mp-0${i + 2}-${n.slug}.png">`);
		parts.push(`<div class="mp-caption">图 ${i + 2} · 海报 ${n.idx}</div>`);
		if (nmp.altImage) {
			parts.push(`<img class="mp-alt-img" src="${htmlEscape(nmp.altImage)}" alt="${htmlEscape(nmp.altAlt || h2)}">`);
			parts.push(`<div class="mp-alt-caption">Unsplash 配图 · 和海报二选一</div>`);
		}
		parts.push(`<div class="mp-oneline"><strong>一句话</strong>：${onelineToHtml(n.oneline)}</div>`);
		for (const p of paragraphs) {
			parts.push(`<p>${p}</p>`);
		}
		parts.push(`<div class="mp-source">${sourceHtml}</div>`);
		parts.push(`<hr class="mp-divider">`);
	});

	parts.push(`<div class="mp-quickview">`);
	parts.push(`  <h3>${htmlEscape(qvTitle)}</h3>`);
	parts.push(`  <ul>`);
	for (const item of qvItems) {
		parts.push(`    <li>${item}</li>`);
	}
	parts.push(`  </ul>`);
	parts.push(`</div>`);

	parts.push(`<div class="mp-cta">`);
	parts.push(`  <div class="big">${ctaBig}</div>`);
	parts.push(`  <div class="sub">${ctaSub}</div>`);
	parts.push(`</div>`);

	const html = parts.join('\n');
	const charCount = html.replace(/<[^>]*>/g, '').replace(/\s+/g, '').length;
	return { html, charCount };
}

/* =========================== Build one =========================== */

interface BuildResult {
	date: string;
	posterPath: string;
	posterBytes: number;
	mpPath: string;
	mpBytes: number;
}

function buildOne(dataFile: string, force: boolean): BuildResult {
	const dataPath = join(DATA_DIR, dataFile);
	const data = loadJson<AiDailyData>(dataPath);
	validate(data, dataFile);

	if (!data.articleUrl) {
		data.articleUrl = `https://jiangren.com.au/blog/ai-daily-${data.date}`;
	}

	const outDir = join(OUTPUT_BASE, data.date);

	/* --- 1. XHS poster 薄壳 --- */
	const posterTemplate = loadTemplate(TEMPLATE_POSTER);
	const posterOutput = renderTemplate(posterTemplate, {
		DATE: data.date,
		POSTER_DATA: JSON.stringify(data, null, 2),
	});
	const posterPath = join(outDir, 'index.html');
	let posterSkipped = false;
	if (canWriteOrSkip(posterPath, force) === 'write') {
		writeWithMarker(posterPath, posterOutput, 'ai-daily');
	} else {
		posterSkipped = true;
	}

	/* --- 2. Mp-article 薄壳 --- */
	const mpTemplate = loadTemplate(TEMPLATE_MP);
	const { html: articleContent, charCount } = renderArticleContent(data);
	const readMin = Math.max(3, Math.round(charCount / 400));
	const mpOutput = renderTemplate(mpTemplate, {
		DATE: data.date,
		BRAND_PRIMARY: AI_DAILY_BRAND.primary,
		BRAND_HIGHLIGHT: AI_DAILY_BRAND.highlight,
		BRAND_DARK: AI_DAILY_BRAND.dark,
		BRAND_JSON: JSON.stringify(AI_DAILY_BRAND),
		ARTICLE_CONTENT: articleContent,
		STAT_CHARS: String(charCount),
		STAT_NEWS: String(data.news.length),
		POSTER_COUNT: String(data.news.length + 1),
		POSTER_LAST_INDEX: String(data.news.length),
		STAT_READ_MIN: String(readMin),
	});
	const mpPath = join(outDir, 'mp-article.html');
	let mpSkipped = false;
	if (canWriteOrSkip(mpPath, force) === 'write') {
		writeWithMarker(mpPath, mpOutput, 'ai-daily');
	} else {
		mpSkipped = true;
	}

	return {
		date: data.date,
		posterPath: posterSkipped ? `${posterPath} (skipped)` : posterPath,
		posterBytes: posterSkipped ? 0 : Buffer.byteLength(posterOutput, 'utf8'),
		mpPath: mpSkipped ? `${mpPath} (skipped)` : mpPath,
		mpBytes: mpSkipped ? 0 : Buffer.byteLength(mpOutput, 'utf8'),
	};
}

export function buildAll(targetDate?: string, force = false): void {
	if (!existsSync(DATA_DIR)) {
		console.warn(`[ai-daily] data dir missing: ${DATA_DIR}`);
		return;
	}
	const files = readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'));
	const toBuild = targetDate ? files.filter(f => f === `${targetDate}.json`) : files;

	if (toBuild.length === 0) {
		console.warn(`[ai-daily] no data${targetDate ? ` for ${targetDate}` : ''}`);
		return;
	}

	const results: BuildResult[] = [];
	const failures: Array<{ file: string; error: string }> = [];

	for (const file of toBuild) {
		try {
			const r = buildOne(file, force);
			results.push(r);
			console.log(`[ai-daily] ✓ ${r.date}`);
			console.log(`    poster: ${r.posterPath} (${(r.posterBytes / 1024).toFixed(1)} KB)`);
			console.log(`    mp:     ${r.mpPath} (${(r.mpBytes / 1024).toFixed(1)} KB)`);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			failures.push({ file, error: msg });
			console.error(`[ai-daily] ✗ ${file}: ${msg}`);
		}
	}

	console.log(`\n[ai-daily] built ${results.length} / ${toBuild.length}`);
	if (failures.length > 0) {
		console.error(`[ai-daily] ${failures.length} failure(s):`);
		for (const f of failures) console.error(`  - ${f.file}: ${f.error}`);
		process.exit(1);
	}
}

// CLI
if (import.meta.main) {
	const args = process.argv.slice(2);
	const force = args.includes('--force');
	const target = args.find(a => !a.startsWith('--'));
	buildAll(target, force);
}
