#!/usr/bin/env node
/**
 * 为每个 dist/ai-news-posters/{date}/index.html 产一套真实 PNG（摘要 + 3-7 条新闻）。
 *
 * 为什么要这一步：
 *   mp-article.html 的图片如果用 base64 data URI，粘到公众号编辑器时会被丢弃。
 *   预渲染成 .png 文件 → GitHub Pages 部署成公网 URL → 公众号粘贴时自动 re-host 到
 *   它自己的 CDN，实现真正"一次复制粘贴完成发稿"。
 *
 * 技术选型：
 *   用 page.screenshot（Chrome paint 层）而不是 html2canvas —— 后者对复杂 CSS
 *   （渐变、offset shadow、webkit-filter）经常失真，前者和浏览器看到的像素级一致。
 *   踩坑记录见 curriculum/.claude/skills/ai-news-poster/SKILL.md 的
 *   「html2canvas 1.4.1 踩坑记录」章节。
 *
 * 用法：
 *   bun run scripts/render-ai-news-posters.mjs           # 处理 dist/ 下所有日期
 *   bun run scripts/render-ai-news-posters.mjs 2026-04-18 # 只处理这一天
 *
 * 输出：dist/ai-news-posters/{date}/poster-0.png ... poster-N.png
 */

import puppeteer from 'puppeteer-core';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	writeFileSync,
	existsSync,
	readdirSync,
	statSync,
} from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');
const HUB = resolve(DIST, 'ai-news-posters');

// ========== Chrome 路径探测 ==========
const CHROME_CANDIDATES = [
	process.env.PUPPETEER_EXECUTABLE_PATH,
	process.env.CHROME_PATH,
	// GitHub Actions + browser-actions/setup-chrome
	'/opt/hostedtoolcache/setup-chrome/chromium/latest/x64/chrome',
	'/usr/bin/google-chrome-stable',
	'/usr/bin/google-chrome',
	'/usr/bin/chromium-browser',
	'/usr/bin/chromium',
	// macOS 本地
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	`${process.env.HOME || ''}/.cache/puppeteer/chrome-headless-shell/mac_arm-146.0.7680.153/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
].filter(Boolean);
const chromePath = CHROME_CANDIDATES.find((p) => p && existsSync(p));
if (!chromePath) {
	console.error('❌ 找不到 Chrome，已尝试：');
	CHROME_CANDIDATES.forEach((p) => console.error('   ' + p));
	console.error('\n设 PUPPETEER_EXECUTABLE_PATH 或 CHROME_PATH 显式指定');
	process.exit(1);
}
console.log(`🌐 Chrome: ${chromePath}`);

// ========== 收集要处理的日期目录 ==========
const arg = process.argv[2];
let dateDirs;
if (arg) {
	const full = resolve(HUB, arg);
	if (!existsSync(full)) {
		console.error(`❌ ${full} 不存在，先跑 bun run build`);
		process.exit(1);
	}
	dateDirs = [arg];
} else {
	if (!existsSync(HUB)) {
		console.log('⚠️ dist/ai-news-posters 不存在，跳过');
		process.exit(0);
	}
	dateDirs = readdirSync(HUB).filter((d) => {
		const full = resolve(HUB, d);
		return statSync(full).isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d);
	});
}

if (!dateDirs.length) {
	console.log('⚠️ 没找到 YYYY-MM-DD 格式的日期目录，跳过');
	process.exit(0);
}
console.log(`📅 将处理 ${dateDirs.length} 个日期：${dateDirs.join(', ')}`);

// ========== 启 browser ==========
const browser = await puppeteer.launch({
	executablePath: chromePath,
	headless: 'new',
	defaultViewport: null,
	args: [
		'--no-sandbox',
		'--disable-dev-shm-usage',
		'--disable-setuid-sandbox',
		'--font-render-hinting=none',
		'--disable-font-subpixel-positioning',
	],
});

let totalOk = 0;
let totalFail = 0;
const startAll = Date.now();

try {
	for (const date of dateDirs) {
		const indexPath = resolve(HUB, date, 'index.html');
		if (!existsSync(indexPath)) {
			console.log(`⚠️ ${date} 没有 index.html，跳过`);
			continue;
		}
		console.log(`\n━━━ 📸 ${date} ━━━`);

		const page = await browser.newPage();
		await page.setViewport({ width: 1600, height: 2000, deviceScaleFactor: 1 });

		const fileUrl = `file://${indexPath}`;
		await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });

		// 等字体 + DOMContentLoaded 里的 layoutPosterScaler / wrapOnelines 异步逻辑
		await page.evaluateHandle('document.fonts.ready');
		await new Promise((r) => setTimeout(r, 800));
		const fontsCount = await page.evaluate(() => document.fonts.size);
		console.log(`  ✓ 字体就绪（${fontsCount} fonts）`);

		// 安装 setup/restore 函数
		await page.evaluate(() => {
			window.__setupForCapture = function (posterId) {
				const poster = document.getElementById(posterId);
				if (!poster) throw new Error('NO_POSTER ' + posterId);

				const POSTER_W = 1242;
				const FRAME_BORDER = 6;
				const FRAME_RADIUS = 36;
				const SHADOW_OFFSET = 24;
				const PADDING = 48;

				const parent = poster.parentNode;
				const next = poster.nextSibling;
				const origStyle = poster.getAttribute('style') || '';

				// 清 layoutPosterScaler 注的 absolute / transform，让 poster 自然撑开
				poster.style.transform = 'none';
				poster.style.position = 'relative';
				poster.style.top = '0';
				poster.style.left = '0';
				poster.style.width = POSTER_W + 'px';
				poster.style.height = 'auto';
				poster.style.margin = '0';

				// 临时 append 测高度
				document.body.appendChild(poster);
				const POSTER_H = poster.offsetHeight;

				// 外 frame：6px 黑边 + 36px 圆角 + 投影
				const frameDiv = document.createElement('div');
				frameDiv.style.cssText = [
					'box-sizing:border-box',
					`width:${POSTER_W + FRAME_BORDER * 2}px`,
					`height:${POSTER_H + FRAME_BORDER * 2}px`,
					`border:${FRAME_BORDER}px solid #10162f`,
					`border-radius:${FRAME_RADIUS}px`,
					`box-shadow:${SHADOW_OFFSET}px ${SHADOW_OFFSET}px 0 #10162f`,
					'background:#fff',
					'overflow:hidden',
				].join(';');
				frameDiv.appendChild(poster);

				const totalW = POSTER_W + FRAME_BORDER * 2 + PADDING * 2 + SHADOW_OFFSET;
				const totalH = POSTER_H + FRAME_BORDER * 2 + PADDING * 2 + SHADOW_OFFSET;

				const wrapper = document.createElement('div');
				wrapper.id = '__capture_wrapper__';
				wrapper.style.cssText = [
					'position:absolute',
					'left:0',
					'top:0',
					`width:${totalW}px`,
					`height:${totalH}px`,
					`padding:${PADDING}px ${PADDING + SHADOW_OFFSET}px ${PADDING + SHADOW_OFFSET}px ${PADDING}px`,
					'background:#fff1e7',
					'box-sizing:border-box',
					'z-index:999999',
				].join(';');
				wrapper.appendChild(frameDiv);
				document.documentElement.scrollTo(0, 0);
				document.body.prepend(wrapper);

				window.__restoreInfo = { poster, parent, next, origStyle, wrapper };
				return { totalW, totalH };
			};

			window.__restoreAfterCapture = function () {
				const r = window.__restoreInfo;
				if (!r) return;
				const { poster, parent, next, origStyle, wrapper } = r;
				if (next) parent.insertBefore(poster, next);
				else parent.appendChild(poster);
				if (origStyle) poster.setAttribute('style', origStyle);
				else poster.removeAttribute('style');
				wrapper.remove();
				window.__restoreInfo = null;
			};
		});

		// Canvas 2D 版（2026-04-21 起）：canvas[data-id] 直接 toDataURL 导出。
		// 新版日报允许 3-7 条新闻，因此不能再把 6 张写死。
		// 老 DOM 版（2026-04-20 之前）：动态读取 poster-N，走 screenshot + frame 包装。
		const posterMode = await page.evaluate(() => {
			const canvases = document.querySelectorAll('canvas[data-id]');
			if (canvases.length > 0) {
				return { kind: 'canvas', slugs: Array.from(canvases).map((c) => c.dataset.id) };
			}
			const ids = Array.from(document.querySelectorAll('[id^="poster-"]'))
				.map((node) => node.id)
				.filter((id) => /^poster-\d+$/.test(id))
				.sort((a, b) => Number(a.slice(7)) - Number(b.slice(7)));
			return { kind: 'dom', ids };
		});

		const OUT_DIR = resolve(HUB, date);
		const startDay = Date.now();

		if (posterMode.kind === 'canvas') {
			const posterCount = posterMode.slugs.length;
			// 让 PosterRenderer.renderAll() 跑完 + 字体就绪 + canvas 实际画完
			// renderAll 是 async 的，上面的 fonts.ready + 800ms 延迟加起来基本够了，保险再给 400ms
			await new Promise((r) => setTimeout(r, 400));
			const dataUrls = await page.evaluate(() =>
				Array.from(document.querySelectorAll('canvas[data-id]')).map((c) => c.toDataURL('image/png')),
			);
			for (let i = 0; i < dataUrls.length; i++) {
				const outFile = resolve(OUT_DIR, `poster-${i}.png`);
				const t0 = Date.now();
				const label = `poster-${i}`;
				process.stdout.write(`  ${String(i + 1).padStart(2, '0')}/${posterCount}  ${label.padEnd(12)} … `);
				try {
					const buf = Buffer.from(dataUrls[i].split(',')[1], 'base64');
					writeFileSync(outFile, buf);
					console.log(
						`✓ ${(buf.length / 1024).toFixed(0)}KB · canvas[data-id="${posterMode.slugs[i]}"] · ${((Date.now() - t0) / 1000).toFixed(2)}s`,
					);
					totalOk++;
				} catch (e) {
					console.log(`❌ ${e.message}`);
					totalFail++;
				}
			}
		} else {
			// 老路径
			const posterCount = posterMode.ids.length;
			if (posterCount === 0) {
				console.log('  ❌ 页面内没有可渲染的 poster-N 元素');
				totalFail++;
			}
			for (const [i, posterId] of posterMode.ids.entries()) {
				const outFile = resolve(OUT_DIR, `${posterId}.png`);
				const t0 = Date.now();
				process.stdout.write(`  ${String(i + 1).padStart(2, '0')}/${posterCount}  ${posterId.padEnd(12)} … `);
				try {
					const dims = await page.evaluate((id) => window.__setupForCapture(id), posterId);
					const png = await page.screenshot({
						type: 'png',
						omitBackground: false,
						clip: { x: 0, y: 0, width: dims.totalW, height: dims.totalH },
					});
					writeFileSync(outFile, png);
					console.log(
						`✓ ${(png.length / 1024).toFixed(0)}KB · ${dims.totalW}×${dims.totalH} · ${((Date.now() - t0) / 1000).toFixed(2)}s`,
					);
					totalOk++;
				} catch (e) {
					console.log(`❌ ${e.message}`);
					totalFail++;
				} finally {
					await page.evaluate(() => window.__restoreAfterCapture());
				}
			}
		}
		console.log(`  ⏱ ${date} 用时 ${((Date.now() - startDay) / 1000).toFixed(1)}s`);

		await page.close();
	}
} finally {
	await browser.close();
}

console.log(
	`\n✅ 完成 · ok=${totalOk} · fail=${totalFail} · 总用时 ${((Date.now() - startAll) / 1000).toFixed(1)}s`,
);
if (totalFail > 0) process.exit(1);
