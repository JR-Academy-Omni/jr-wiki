/**
 * jr-wiki build script
 *
 * Reads markdown content → outputs:
 *   dist/manifest.json       — metadata for main site discovery
 *   dist/content/books/      — raw markdown files
 *   dist/content/articles/   — raw markdown files
 *   dist/content/help/       — raw markdown files
 *   dist/content/stories/    — raw markdown files
 *   dist/_preview/index.html — internal management preview page
 *   dist/robots.txt          — disallow _preview from crawlers
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, cpSync, existsSync, rmSync } from 'fs';
import { join } from 'path';

const SRC = './src/content';
const DIST = './dist';
const STATIC = './src/static';

// Clean
if (existsSync(DIST)) rmSync(DIST, { recursive: true });
mkdirSync(DIST, { recursive: true });

// ─── Parse helpers ───

function parseYaml(yaml: string): Record<string, any> {
	const result: Record<string, any> = {};
	const lines = yaml.split('\n');
	let currentKey = '';
	let currentArray: any[] | null = null;

	for (const line of lines) {
		const arrayMatch = line.match(/^\s+-\s+(.+)/);
		if (arrayMatch && currentKey) {
			if (!currentArray) { currentArray = []; result[currentKey] = currentArray; }
			currentArray.push(parseValue(arrayMatch[1].trim()));
			continue;
		}
		const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)/);
		if (kvMatch) {
			currentArray = null;
			currentKey = kvMatch[1];
			const raw = kvMatch[2].trim();
			result[currentKey] = raw === '' ? null : parseValue(raw);
		}
	}
	return result;
}

function parseValue(val: string): any {
	if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) return val.slice(1, -1);
	if (val === 'true') return true;
	if (val === 'false') return false;
	if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
	if (val.startsWith('[') && val.endsWith(']')) {
		const inner = val.slice(1, -1).trim();
		if (!inner) return [];
		return inner.split(',').map(s => parseValue(s.trim()));
	}
	return val;
}

function extractFrontmatter(content: string): { meta: Record<string, any>; body: string } {
	const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)/);
	if (!match) return { meta: {}, body: content };
	return { meta: parseYaml(match[1]), body: match[2] };
}

function readMdFiles(dir: string) {
	if (!existsSync(dir)) return [];
	return readdirSync(dir).filter(f => f.endsWith('.md')).sort();
}

// ─── Build Books ───

const booksDir = join(SRC, 'wiki');
const books: any[] = [];

for (const folder of readdirSync(booksDir).filter(f => statSync(join(booksDir, f)).isDirectory())) {
	const metaPath = join(booksDir, folder, '_meta.yaml');
	if (!existsSync(metaPath)) continue;

	const meta = parseYaml(readFileSync(metaPath, 'utf-8'));
	const chapters: any[] = [];

	// Copy markdown files
	const outDir = join(DIST, 'content/books', folder);
	mkdirSync(outDir, { recursive: true });

	for (const file of readMdFiles(join(booksDir, folder))) {
		const raw = readFileSync(join(booksDir, folder, file), 'utf-8');
		const { meta: fm } = extractFrontmatter(raw);
		const slug = file.replace('.md', '');

		// Copy raw markdown
		cpSync(join(booksDir, folder, file), join(outDir, file));

		chapters.push({
			slug,
			title: fm.title,
			description: fm.description || null,
			order: fm.order || 0,
			contentUrl: `src/content/wiki/${folder}/${file}`,
		});
	}

	chapters.sort((a, b) => a.order - b.order);

	books.push({
		slug: folder,
		title: meta.title,
		description: meta.description,
		tags: meta.tags || [],
		order: meta.order || 0,
		chapterCount: chapters.length,
		chapters,
	});
}

books.sort((a, b) => a.order - b.order);

// ─── Build Articles ───

const articlesDir = join(SRC, 'articles');
const articles: any[] = [];
const articlesOutDir = join(DIST, 'content/articles');
mkdirSync(articlesOutDir, { recursive: true });

for (const file of readMdFiles(articlesDir)) {
	const raw = readFileSync(join(articlesDir, file), 'utf-8');
	const { meta: fm } = extractFrontmatter(raw);
	const slug = file.replace('.md', '');

	cpSync(join(articlesDir, file), join(articlesOutDir, file));

	articles.push({
		slug,
		title: fm.title,
		description: fm.description || null,
		publishDate: fm.publishDate || null,
		tags: fm.tags || [],
		author: fm.author || 'JR Academy',
		contentUrl: `src/content/articles/${file}`,
	});
}

articles.sort((a, b) => {
	if (!a.publishDate || !b.publishDate) return 0;
	return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
});

// ─── Build Help ───

const helpDir = join(SRC, 'help');
const helpItems: any[] = [];
const helpOutDir = join(DIST, 'content/help');
mkdirSync(helpOutDir, { recursive: true });

for (const file of readMdFiles(helpDir)) {
	const raw = readFileSync(join(helpDir, file), 'utf-8');
	const { meta: fm } = extractFrontmatter(raw);
	const slug = file.replace('.md', '');

	cpSync(join(helpDir, file), join(helpOutDir, file));

	helpItems.push({
		slug,
		title: fm.title,
		description: fm.description || null,
		category: fm.category || null,
		order: fm.order || 0,
		contentUrl: `src/content/help/${file}`,
	});
}

helpItems.sort((a, b) => a.order - b.order);

// ─── Build Stories ───

const storiesDir = join(SRC, 'stories');
const storyItems: any[] = [];
const storiesOutDir = join(DIST, 'content/stories');
mkdirSync(storiesOutDir, { recursive: true });

for (const file of readMdFiles(storiesDir)) {
	const raw = readFileSync(join(storiesDir, file), 'utf-8');
	const { meta: fm } = extractFrontmatter(raw);
	const slug = file.replace('.md', '');

	cpSync(join(storiesDir, file), join(storiesOutDir, file));

	storyItems.push({
		slug,
		title: fm.title,
		description: fm.description || null,
		name: fm.name,
		role: fm.role,
		company: fm.company || null,
		course: fm.course || null,
		highlight: fm.highlight || null,
		publishDate: fm.publishDate || null,
		tags: fm.tags || [],
		contentUrl: `src/content/stories/${file}`,
	});
}

storyItems.sort((a, b) => {
	if (!a.publishDate || !b.publishDate) return 0;
	return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
});

// ─── Write manifest.json ───

const manifest = {
	generatedAt: new Date().toISOString(),
	baseUrl: '',
	books,
	articles,
	help: helpItems,
	stories: storyItems,
	stats: {
		totalBooks: books.length,
		totalChapters: books.reduce((s, b) => s + b.chapterCount, 0),
		totalArticles: articles.length,
		totalHelp: helpItems.length,
		totalStories: storyItems.length,
	},
};

writeFileSync(join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2));

// ─── Write robots.txt ───
// jr-wiki GitHub Pages (jr-academy-omni.github.io/jr-wiki/*) 全站禁止爬虫。
// 所有链接都是**运营内部**使用（海报下载 / 公众号发稿 / 校园活动审阅）。
// 真正对外的公开内容（博客 / wiki / 故事）走 jiangren.com.au/*，由主站 Next.js 提供 SEO。

writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nDisallow: /\n`);

// ─── Copy static site assets ───

if (existsSync(STATIC)) {
	cpSync(STATIC, DIST, { recursive: true });
}

// ─── Expose src/data/ to GitHub Pages as /data/*.json（供牛小匠等外部 app 消费） ───
// Copy 所有 data JSON（schemas + samples），生成 per-type index.json 汇总最新 N 条。
// 外部 app 读 URL：https://jr-academy-omni.github.io/jr-wiki/data/uni-events/2026-04-23.json

const DATA_SRC = './src/data';
const DATA_DIST = join(DIST, 'data');
if (existsSync(DATA_SRC)) {
	cpSync(DATA_SRC, DATA_DIST, { recursive: true });

	// 生成 index.json per content type：列出所有可用日期 + 每天的 one-liner summary
	for (const contentType of ['ai-daily', 'uni-events']) {
		const dir = join(DATA_DIST, contentType);
		if (!existsSync(dir)) continue;
		const dates: Array<{ date: string; summary: Record<string, unknown> }> = [];
		for (const file of readdirSync(dir)) {
			if (!file.endsWith('.json') || file.startsWith('_') || file === 'index.json') continue;
			const date = file.replace(/\.json$/, '');
			try {
				const data = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
				let summary: Record<string, unknown> = { date };
				if (contentType === 'ai-daily') {
					summary = {
						date,
						headline: data.summary?.items?.[0]?.t || '',
						newsCount: Array.isArray(data.news) ? data.news.length : 0,
					};
				} else if (contentType === 'uni-events') {
					summary = {
						date,
						intro: data.intro || '',
						schoolsWithEvents: (data.schools || []).filter((s: any) => (s.events || []).length > 0).length,
						totalEvents: (data.schools || []).reduce((sum: number, s: any) => sum + (s.events || []).length, 0),
						schools: (data.schools || []).map((s: any) => ({
							code: s.code,
							eventCount: (s.events || []).length,
						})),
					};
				}
				dates.push({ date, summary });
			} catch (e) {
				console.warn(`[data-index] skip ${file}: ${(e as Error).message}`);
			}
		}
		dates.sort((a, b) => b.date.localeCompare(a.date));
		const index = {
			type: contentType,
			latest: dates[0]?.date || null,
			count: dates.length,
			entries: dates.map(d => d.summary),
		};
		writeFileSync(join(dir, 'index.json'), JSON.stringify(index, null, 2));
	}

	// Uni News 走 per-school 组织：每校一份 index
	const uniNewsDir = join(DATA_DIST, 'uni-news');
	if (existsSync(uniNewsDir)) {
		const schoolIndices: Record<string, Array<{ date: string; summary: Record<string, unknown> }>> = {};
		for (const school of readdirSync(uniNewsDir)) {
			const schoolDir = join(uniNewsDir, school);
			if (!statSync(schoolDir).isDirectory()) continue;
			if (school.startsWith('_')) continue;
			const entries: Array<{ date: string; summary: Record<string, unknown> }> = [];
			for (const file of readdirSync(schoolDir)) {
				if (!file.endsWith('.json') || file === 'index.json') continue;
				const date = file.replace(/\.json$/, '');
				try {
					const data = JSON.parse(readFileSync(join(schoolDir, file), 'utf-8'));
					entries.push({
						date,
						summary: {
							date,
							newsCount: Array.isArray(data.news) ? data.news.length : 0,
							firstNewsTitle: data.news?.[0]?.h2Main || '',
						},
					});
				} catch {}
			}
			entries.sort((a, b) => b.date.localeCompare(a.date));
			writeFileSync(join(schoolDir, 'index.json'), JSON.stringify({
				school,
				latest: entries[0]?.date || null,
				count: entries.length,
				entries: entries.map(e => e.summary),
			}, null, 2));
			schoolIndices[school] = entries;
		}
		// 顶层 uni-news/index.json: 各校最新日期
		writeFileSync(join(uniNewsDir, 'index.json'), JSON.stringify({
			type: 'uni-news',
			schools: Object.entries(schoolIndices).map(([school, entries]) => ({
				school,
				latest: entries[0]?.date || null,
				count: entries.length,
			})),
		}, null, 2));
	}

	console.log(`   📊 dist/data/ — 外部消费用 JSON endpoints (牛小匠 etc)`);
}

// ─── Generate preview page ───

const previewDir = join(DIST, '_preview');
mkdirSync(previewDir, { recursive: true });

const previewHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>JR Wiki 内容管理预览</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=DM+Sans:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
:root { --red: #ff5757; --dark: #10162f; --warm: #fff1e7; --grey: #6b7280; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: "DM Sans", "Noto Sans SC", sans-serif; background: var(--warm); color: var(--dark); line-height: 1.6; }
.header { background: var(--dark); color: #fff; padding: 20px 24px; border-bottom: 3px solid #000; }
.header h1 { font-family: "Bricolage Grotesque", sans-serif; font-size: 22px; }
.header p { color: rgba(255,255,255,0.5); font-size: 13px; margin-top: 4px; }
.container { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
.stats { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 32px; }
.stat { background: #fff; border: 2px solid #000; box-shadow: 4px 4px 0 #000; padding: 12px 20px; font-family: "Space Mono", monospace; }
.stat strong { font-size: 24px; color: var(--red); display: block; }
.stat span { font-size: 12px; color: var(--grey); }
.section { margin-bottom: 40px; }
.section h2 { font-family: "Bricolage Grotesque", sans-serif; font-size: 20px; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #000; }
.card { background: #fff; border: 2px solid #000; box-shadow: 4px 4px 0 #000; padding: 16px; margin-bottom: 10px; transition: transform 0.15s, box-shadow 0.15s; }
.card:hover { transform: translate(3px,3px); box-shadow: none; }
.card h3 { font-size: 16px; margin-bottom: 4px; }
.card p { font-size: 13px; color: var(--grey); }
.tag { display: inline-block; font-family: "Space Mono", monospace; font-size: 11px; font-weight: 700; padding: 2px 8px; border: 2px solid #000; background: #ffde59; margin-right: 4px; }
.tag.green { background: #7ed957; }
.tag.blue { background: #38b6ff; color: #fff; }
.chapters { margin-top: 8px; padding-left: 20px; }
.chapters li { font-size: 13px; color: var(--grey); margin-bottom: 2px; }
.meta { font-family: "Space Mono", monospace; font-size: 11px; color: var(--grey); margin-top: 6px; }
.badge { background: var(--red); color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border: 2px solid #000; margin-left: 8px; }
@media (max-width: 768px) { .stats { flex-direction: column; } }
</style>
</head>
<body>
<div class="header">
  <h1>JR Wiki 内容管理预览 <span class="badge">内部</span></h1>
  <p>生成时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Australia/Sydney' })} AEST · 此页面不对外公开</p>
</div>
<div class="container">
  <div class="stats">
    <div class="stat"><strong>${manifest.stats.totalBooks}</strong><span>电子书</span></div>
    <div class="stat"><strong>${manifest.stats.totalChapters}</strong><span>章节</span></div>
    <div class="stat"><strong>${manifest.stats.totalArticles}</strong><span>文章</span></div>
    <div class="stat"><strong>${manifest.stats.totalHelp}</strong><span>帮助文档</span></div>
    <div class="stat"><strong>${manifest.stats.totalStories}</strong><span>学员故事</span></div>
  </div>

  <div class="section">
    <h2>📖 电子书</h2>
    ${books.map(b => `
    <div class="card">
      <h3>${b.title} <span class="tag">${b.chapterCount} 章</span></h3>
      <p>${b.description}</p>
      <div style="margin-top:6px">${(b.tags || []).map((t: string) => `<span class="tag">${t}</span>`).join('')}</div>
      <ol class="chapters">
        ${b.chapters.map((c: any) => `<li>${c.title}</li>`).join('')}
      </ol>
    </div>`).join('')}
  </div>

  <div class="section">
    <h2>📝 文章</h2>
    ${articles.map(a => `
    <div class="card">
      <h3>${a.title}</h3>
      <p>${a.description}</p>
      <div class="meta">${a.publishDate || ''} · ${a.author} ${(a.tags || []).map((t: string) => `<span class="tag">${t}</span>`).join('')}</div>
    </div>`).join('')}
  </div>

  <div class="section">
    <h2>❓ 帮助中心</h2>
    ${helpItems.map(h => `
    <div class="card">
      <h3>${h.title} <span class="tag">${h.category}</span></h3>
      <p>${h.description}</p>
    </div>`).join('')}
  </div>

  <div class="section">
    <h2>🌟 学员故事</h2>
    ${storyItems.map(s => `
    <div class="card">
      <h3>${s.title}</h3>
      <p>${s.description}</p>
      <div style="margin-top:6px">
        <span class="tag">${s.role}</span>
        ${s.company ? `<span class="tag green">${s.company}</span>` : ''}
        ${s.course ? `<span class="tag blue">${s.course}</span>` : ''}
        ${s.highlight ? `<span class="tag" style="background:#ff914d;color:#fff">${s.highlight}</span>` : ''}
      </div>
    </div>`).join('')}
  </div>
</div>
</body>
</html>`;

writeFileSync(join(previewDir, 'index.html'), previewHtml);

// ─── CORS headers file for nginx ───

writeFileSync(join(DIST, '_headers'), `/*\n  Access-Control-Allow-Origin: *\n`);

// ─── Scheduled Content Data Pipelines ───
// Runs data → template renders for AI Daily / Uni News / Uni Events.
// Outputs land in src/static/, not dist/, because GitHub Pages serves them directly.
// See docs/SCHEDULED_CONTENT_PLATFORM_PRD.md for full architecture.

console.log('\n─── Data Pipelines ───');
const { buildAll: buildAiDaily } = await import('./build/pipelines/ai-daily.pipeline');
const { buildAll: buildUniNews } = await import('./build/pipelines/uni-news.pipeline');
const { buildAll: buildUniEvents } = await import('./build/pipelines/uni-events.pipeline');
buildAiDaily();
buildUniNews();
buildUniEvents();

// ─── Done ───

console.log(`\n✅ Built jr-wiki content API`);
console.log(`   📖 ${books.length} books (${manifest.stats.totalChapters} chapters)`);
console.log(`   📝 ${articles.length} articles`);
console.log(`   ❓ ${helpItems.length} help docs`);
console.log(`   🌟 ${storyItems.length} stories`);
console.log(`   📄 dist/manifest.json`);
console.log(`   📂 dist/content/`);
console.log(`   👀 dist/_preview/index.html`);
