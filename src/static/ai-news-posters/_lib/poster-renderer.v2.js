/**
 * AI 每日头条海报 · 共享渲染库 · v2
 *
 * v1 → v2 变化：
 *   1. FLEX_HEIGHT：canvas 高度自动选档（1660 / 1980 / 2310），文字长自动变高
 *   2. OVERFLOW_FALLBACK：超 2310 档位时的降级策略（shrink / ellipsis）
 *   3. measureSinglePoster()：dry-run 测量单图所需高度
 *   4. drawSinglePoster / drawFooter 接 canvasH 参数（不再硬编码 H）
 *
 * 向后兼容：renderAll 接口兼容 v1，默认 FLEX_HEIGHT:false。
 * 老页面（2026-04-21 及之前）继续用 v1，新页面用 v2。
 *
 * 用法：
 *
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>
 *   <script src="../_lib/poster-renderer.v2.js"></script>
 *   <script>
 *     PosterRenderer.renderAll({
 *       DATE: '2026-04-23',
 *       SUMMARY: {...},
 *       NEWS: [...],
 *       FLEX_HEIGHT: true,                    // 开启 flex-height（推荐）
 *       HEIGHT_TIERS: [1660, 1980, 2310],     // 可选，默认这 3 档
 *       OVERFLOW_FALLBACK: 'shrink',          // 'shrink' | 'ellipsis'
 *     });
 *   </script>
 */
(function () {
  'use strict';

  /* ============================ 常量 ============================ */

  const W = 1242;
  const DEFAULT_H = 1660;
  const DEFAULT_HEIGHT_TIERS = [1660, 1980, 2310];

  const OUTER = 32;
  const BORDER = 5;
  const RADIUS = 36;
  const PAD_X = 72, PAD_Y = 80;

  const FF_CN = '"Noto Sans SC", system-ui, sans-serif';
  const FF_MONO = '"JetBrains Mono", monospace';
  const FF_DISPLAY = '"Bricolage Grotesque", "Noto Sans SC", sans-serif';

  /* ============================ 画法助手 ============================ */

  function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function fitText(ctx, text, fontSpec, maxW, startSize, minSize) {
    let size = startSize;
    ctx.font = fontSpec(size);
    while (ctx.measureText(text).width > maxW && size > minSize) {
      size -= 4;
      ctx.font = fontSpec(size);
    }
    return size;
  }

  function tokensToText(tokens) {
    return (tokens || []).map(t => t.text || '').join('').replace(/\s+/g, ' ').trim();
  }

  function drawPaperGrid(ctx, H) {
    ctx.fillStyle = '#f7f3ea';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(16,22,47,0.055)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 62) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 62) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(W, y + 0.5);
      ctx.stroke();
    }
  }

  function drawMarsHeader(ctx, DATE, label) {
    const dateText = DATE.replace(/-/g, ' · ');
    ctx.fillStyle = '#10131f';
    ctx.fillRect(72, 48, 516, 42);
    ctx.fillStyle = '#fff';
    ctx.font = `700 22px ${FF_MONO}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`JR ACADEMY · AI 日报 · ${label || 'TODAY'}`, 88, 77);
    ctx.font = `900 24px ${FF_CN}`;
    ctx.fillStyle = '#10131f';
    ctx.fillText('匠人 AI 日历', 606, 77);
    ctx.font = `500 20px ${FF_MONO}`;
    ctx.fillStyle = '#565967';
    const dw = ctx.measureText(dateText).width;
    ctx.fillText(dateText, W - 72 - dw, 76);
    ctx.strokeStyle = '#10131f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(72, 110);
    ctx.lineTo(W - 72, 110);
    ctx.stroke();
  }

  function drawStamp(ctx, x, y, text, bg, color) {
    ctx.fillStyle = bg || '#10131f';
    ctx.fillRect(x, y, ctx.measureText(text).width + 30, 36);
    ctx.fillStyle = color || '#fff';
    ctx.font = `700 18px ${FF_MONO}`;
    ctx.fillText(text, x + 14, y + 25);
  }

  function drawSharpBox(ctx, x, y, w, h, fill, stroke, shadow) {
    if (shadow) {
      ctx.fillStyle = '#10131f';
      ctx.fillRect(x + shadow, y + shadow, w, h);
    }
    ctx.fillStyle = fill || '#fff';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = stroke || '#10131f';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  }

  function drawNewsNode(ctx, x, y, kind) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#10131f';
    ctx.lineWidth = 4;
    if (kind === 1) {
      ctx.beginPath();
      ctx.moveTo(10, 42); ctx.lineTo(98, 42);
      ctx.moveTo(58, 0); ctx.lineTo(58, 84);
      ctx.stroke();
      ['#f7f3ea', '#ffd225', '#e5261f'].forEach((c, idx) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(idx === 0 ? 18 : idx === 1 ? 58 : 98, 42, 18, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      });
    } else if (kind === 2) {
      ctx.fillStyle = '#e5261f';
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(36, -12, 28, 28);
      ctx.strokeRect(36, -12, 28, 28);
      ctx.rotate(-Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(14, 56); ctx.lineTo(108, 56);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(20, 80); ctx.lineTo(66, 6); ctx.lineTo(112, 80); ctx.closePath();
      ctx.stroke();
      ['#ffd225', '#f7f3ea', '#e5261f'].forEach((c, idx) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(idx === 0 ? 20 : idx === 1 ? 66 : 112, idx === 1 ? 6 : 80, 16, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      });
    }
    ctx.restore();
  }

  function drawMiniLab(ctx, x, y, scale) {
    scale = scale || 1;
    const s = v => v * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = s(4);
    ctx.strokeStyle = '#10131f';
    ctx.fillStyle = '#f7f3ea';
    ctx.fillRect(0, s(128), s(400), s(250));
    ctx.strokeRect(0, s(128), s(400), s(250));
    ctx.beginPath();
    ctx.moveTo(s(-12), s(128));
    ctx.lineTo(s(412), s(128));
    ctx.stroke();
    ctx.fillStyle = '#10131f';
    ctx.fillRect(s(190), s(235), s(80), s(143));
    ctx.fillStyle = '#f7f3ea';
    ctx.strokeRect(s(202), s(252), s(56), s(50));
    ctx.strokeRect(s(202), s(312), s(56), s(50));
    ctx.fillStyle = '#ffd225';
    const wins = [[38, 170], [305, 170], [38, 284], [305, 284]];
    wins.forEach(([wx, wy]) => {
      ctx.fillRect(s(wx), s(wy), s(82), s(58));
      ctx.strokeRect(s(wx), s(wy), s(82), s(58));
      ctx.beginPath();
      ctx.moveTo(s(wx + 41), s(wy));
      ctx.lineTo(s(wx + 41), s(wy + 58));
      ctx.moveTo(s(wx), s(wy + 29));
      ctx.lineTo(s(wx + 82), s(wy + 29));
      ctx.stroke();
    });
    ctx.fillStyle = '#10131f';
    ctx.fillRect(s(194), s(174), s(86), s(36));
    ctx.fillStyle = '#ffd225';
    ctx.font = `700 ${s(18)}px ${FF_MONO}`;
    ctx.fillText('LAB 01', s(206), s(199));
    ctx.strokeStyle = '#10131f';
    ctx.beginPath();
    ctx.moveTo(s(94), s(128));
    ctx.lineTo(s(94), s(34));
    ctx.stroke();
    ctx.fillStyle = '#ff2f1f';
    ctx.beginPath();
    ctx.arc(s(94), s(32), s(14), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#10131f';
    ctx.beginPath();
    ctx.moveTo(s(355), s(128));
    ctx.lineTo(s(355), s(86));
    ctx.stroke();
    ctx.fillStyle = '#ff2f1f';
    ctx.beginPath();
    ctx.arc(s(405), s(70), s(42), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#10131f';
    ctx.beginPath();
    ctx.moveTo(s(370), s(92));
    ctx.lineTo(s(432), s(52));
    ctx.moveTo(s(360), s(70));
    ctx.lineTo(s(450), s(70));
    ctx.stroke();
    ctx.fillStyle = '#ff2f1f';
    ctx.beginPath();
    ctx.moveTo(s(312), s(98));
    ctx.lineTo(s(354), s(108));
    ctx.lineTo(s(312), s(118));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  const ATOM_RE = /[A-Za-z0-9]+(?:[-'’·.][A-Za-z0-9]+)*%?|\s+|[^A-Za-z0-9\s]/g;

  function layoutTokens(ctx, tokens, fontSpec, size, lineHeight, maxW) {
    ctx.font = fontSpec(size);
    const lines = [];
    let curLine = [];
    let curX = 0;

    function pushLine() {
      if (curLine.length) lines.push(curLine);
      curLine = [];
      curX = 0;
    }

    for (const tok of tokens) {
      const pieces = tok.text.split('\n');
      for (let pi = 0; pi < pieces.length; pi++) {
        if (pi > 0) pushLine();
        const piece = pieces[pi];
        if (!piece) continue;

        const atoms = piece.match(ATOM_RE) || [];
        for (const atom of atoms) {
          const atomW = ctx.measureText(atom).width;
          const isWs = /^\s+$/.test(atom);

          if (isWs && curLine.length === 0) continue;

          if (atomW > maxW) {
            for (const ch of atom) {
              const cw = ctx.measureText(ch).width;
              if (curX + cw > maxW && curLine.length) pushLine();
              const run = { text: ch, hl: !!tok.hl, bold: !!tok.bold, color: tok.color, x: curX, width: cw };
              curLine.push(run);
              curX += cw;
            }
            continue;
          }

          if (curX + atomW > maxW) {
            pushLine();
            if (isWs) continue;
          }

          const run = {
            text: atom,
            hl: !!tok.hl,
            bold: !!tok.bold,
            color: tok.color,
            x: curX,
            width: atomW,
          };
          curLine.push(run);
          curX += atomW;
        }
      }
    }
    pushLine();

    return { lines, size, lineH: size * lineHeight };
  }

  function drawLaidOut(ctx, laid, startX, startY, fontSpec, baseColor, opts) {
    opts = opts || {};
    const hlBg = opts.hlBg || '#ffce44';
    const hlPadX = opts.hlPadX || 8;
    const hlPadY = opts.hlPadY || 4;
    const hlRadius = opts.hlRadius || 4;
    const boldWeight = opts.boldWeight || 900;
    const normalWeight = opts.normalWeight || opts.weight || 900;
    const { lines, size, lineH } = laid;

    if (hlBg !== 'transparent') {
      for (let li = 0; li < lines.length; li++) {
        const y = startY + li * lineH;
        for (const run of lines[li]) {
          if (!run.hl) continue;
          const bx = startX + run.x - hlPadX;
          const by = y + (lineH - size) / 2 - hlPadY + size * 0.08;
          const bw = run.width + hlPadX * 2;
          const bh = size * 0.92 + hlPadY * 2;
          ctx.fillStyle = hlBg;
          roundRectPath(ctx, bx, by, bw, bh, hlRadius);
          ctx.fill();
        }
      }
    }

    ctx.textBaseline = 'alphabetic';
    for (let li = 0; li < lines.length; li++) {
      const y = startY + li * lineH;
      const baseline = y + (lineH - size) / 2 + size * 0.82;
      for (const run of lines[li]) {
        const w = run.bold ? boldWeight : normalWeight;
        ctx.font = fontSpec(size, w);
        ctx.fillStyle = run.color || baseColor;
        ctx.fillText(run.text, startX + run.x, baseline);
      }
    }
  }

  function ellipsizeToWidth(ctx, text, maxW) {
    let out = text.replace(/\s+$/g, '');
    if (ctx.measureText(out).width <= maxW) return out;
    while (out.length > 1 && ctx.measureText(out + '…').width > maxW) {
      out = out.slice(0, -1);
    }
    return out + '…';
  }

  function truncateText(text, maxChars) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!maxChars || normalized.length <= maxChars) return normalized;
    return normalized.slice(0, Math.max(1, maxChars - 1)).replace(/[，。；、\s]+$/g, '') + '…';
  }

  function clampLaidOut(ctx, laid, fontSpec, maxLines, maxW) {
    if (!maxLines || laid.lines.length <= maxLines) return laid;
    const lines = laid.lines.slice(0, maxLines).map(line => line.map(run => ({ ...run })));
    const last = lines[lines.length - 1];
    const text = last.map(run => run.text).join('');
    ctx.font = fontSpec(laid.size, 500);
    const clipped = ellipsizeToWidth(ctx, text, maxW);
    last.length = 0;
    last.push({ text: clipped, x: 0, width: ctx.measureText(clipped).width });
    return { ...laid, lines };
  }

  function drawQR(ctx, x, y, size, url) {
    if (typeof qrcode !== 'function') {
      console.error('[poster-renderer.v2] qrcode-generator 未加载');
      return;
    }
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    const modules = qr.getModuleCount();
    const QUIET = 16;
    const inner = size - QUIET * 2;
    const cell = inner / modules;

    ctx.fillStyle = '#ffffff';
    roundRectPath(ctx, x, y, size, size, 14);
    ctx.fill();
    ctx.strokeStyle = '#10162f';
    ctx.lineWidth = 3;
    roundRectPath(ctx, x + 1.5, y + 1.5, size - 3, size - 3, 13);
    ctx.stroke();

    ctx.fillStyle = '#10162f';
    const ox = x + QUIET, oy = y + QUIET;
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(ox + c * cell, oy + r * cell, cell + 0.6, cell + 0.6);
        }
      }
    }
  }

  function drawDotDecor(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(100,116,139,0.10)';
    const STEP = 28;
    for (let dx = STEP / 2; dx < w; dx += STEP) {
      for (let dy = STEP / 2; dy < h; dy += STEP) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawShell(ctx, bg, H) {
    drawPaperGrid(ctx, H);
  }

  /* =========================== 测量（dry-run） =========================== */

  /**
   * 测量单图海报所需总高度（不实际画）
   * 用来选 flex-height 档位
   */
  function measureSinglePoster(ctx, d, shrinkLevel) {
    shrinkLevel = shrinkLevel || 0;
    const CX = 72;
    const CW = W - 144;
    let y = 146;

    // Category stamp + index row. Leave enough vertical room so the badge
    // does not collide with the large numeric index/title block.
    y += 150;

    // Title block. Keep this aligned with drawSinglePoster(), where long
    // titles are limited to three lines before the divider.
    const titlePlain = tokensToText(d.title);
    const titleSpec = (s, w) => `${w || 900} ${s}px ${FF_CN}`;
    // 与 drawSinglePoster 保持同一字号公式，确保 measure 与 draw 的 y 轨迹一致
    let titleSize = Math.min(78, d.titleSize || 72);
    const titleMaxW = CW - 250;
    let titleLaid = layoutTokens(ctx, [{ text: titlePlain }], titleSpec, titleSize, 1.12, titleMaxW);
    while (titleLaid.lines.length > 3 && titleSize > 60) {
      titleSize -= 4;
      titleLaid = layoutTokens(ctx, [{ text: titlePlain }], titleSpec, titleSize, 1.12, titleMaxW);
    }
    const titleLines = Math.min(titleLaid.lines.length, 3);
    y += Math.max(76, titleLines * titleLaid.lineH - 4);
    y += 74;

    // One-line summary. lineH 与 draw 对齐（1.22）。
    const oneFontSize = Math.max(38, 44 - shrinkLevel * 2);
    const oneSpec = (s, w) => `${w || 700} ${s}px ${FF_CN}`;
    const oneLaid = layoutTokens(ctx, d.oneline, oneSpec, oneFontSize, 1.22, CW - 56);
    y += Math.max(104, oneLaid.lines.length * oneLaid.lineH + 30);

    // Three content cards. Measure from actual paragraph length instead of
    // forcing every news poster into a fixed 2100px canvas; otherwise dense
    // stories get visibly squeezed in P1-P5.
    const cardGap = 20;
    const bulletValSize = Math.max(36, Math.min(42, 42 - shrinkLevel * 2));
    for (const b of d.bullets || []) {
      const valSpec = (s, w) => `${w || 500} ${s}px ${FF_CN}`;
      const valLaid = layoutTokens(ctx, [{ text: truncateText(b.v, d.posterMaxChars || 92) }], valSpec, bulletValSize, 1.34, CW - 76);
      const textH = valLaid.lines.length * valLaid.lineH;
      const cardH = Math.max(300, Math.min(560, 176 + textH));
      y += cardH + cardGap;
    }

    // Footer + breathing room.
    y += 226 + OUTER;

    return Math.ceil(y);
  }

  /**
   * 选档位：从 tiers 里找第一个 >= required 的
   * 若超最大档位，返回 null → 触发 OVERFLOW_FALLBACK
   */
  function selectHeightTier(requiredHeight, tiers) {
    for (const tier of tiers) {
      if (tier >= requiredHeight) return tier;
    }
    return null;
  }

  /* =========================== 单图海报 =========================== */

  function drawSinglePoster(ctx, d, DATE, articleUrl, H, shrinkLevel) {
    shrinkLevel = shrinkLevel || 0;
    ctx.clearRect(0, 0, W, H);
    drawShell(ctx, d.bg, H);

    drawMarsHeader(ctx, DATE, `NEWS ${d.idx || '01'}`);

    const CX = 72;
    const CW = W - 144;
    let y = 146;

    drawSharpBox(ctx, CX, y, 244, 54, '#ffd225', '#10131f', 6);
    ctx.font = `900 24px ${FF_CN}`;
    ctx.fillStyle = '#10131f';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(d.catText || 'AI 新闻', CX + 22, y + 36);
    drawSharpBox(ctx, W - 286, y, 214, 54, '#f7f3ea', '#10131f', 0);
    ctx.font = `700 22px ${FF_MONO}`;
    ctx.fillStyle = '#e5261f';
    ctx.fillText('★', W - 258, y + 35);
    ctx.fillStyle = '#10131f';
    ctx.fillText(`${d.idx} / 05`, W - 226, y + 35);

    y += 150;
    ctx.font = `900 80px ${FF_MONO}`;
    ctx.fillStyle = '#e5261f';
    ctx.fillText(d.idx, CX, y + 6);
    ctx.font = `900 72px ${FF_CN}`;
    ctx.fillStyle = '#10131f';
    const titlePlain = tokensToText(d.title);
    const titleSpec = (s, w) => `${w || 900} ${s}px ${FF_CN}`;
    let titleSize = Math.min(78, d.titleSize || 72);
    const titleMaxW = CW - 250;
    let titleLaid = layoutTokens(ctx, [{ text: titlePlain }], titleSpec, titleSize, 1.12, titleMaxW);
    while (titleLaid.lines.length > 3 && titleSize > 60) {
      titleSize -= 4;
      titleLaid = layoutTokens(ctx, [{ text: titlePlain }], titleSpec, titleSize, 1.12, titleMaxW);
    }
    titleLaid = clampLaidOut(ctx, titleLaid, titleSpec, 3, titleMaxW);
    drawLaidOut(ctx, titleLaid, CX + 104, y - 62, titleSpec, '#10131f', {
      hlBg: 'transparent',
      normalWeight: 900,
    });
    y += Math.max(76, titleLaid.lines.length * titleLaid.lineH - 4);

    ctx.strokeStyle = 'rgba(16,19,31,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CX, y + 26);
    ctx.lineTo(CX + CW, y + 26);
    ctx.stroke();
    y += 74;

    ctx.fillStyle = '#e5261f';
    ctx.fillRect(CX, y - 10, 6, 82);
    const oneSpec = (s, w) => `${w || 700} ${s}px ${FF_CN}`;
    const oneLaid = layoutTokens(ctx, d.oneline, oneSpec, 44, 1.22, CW - 56);
    drawLaidOut(ctx, oneLaid, CX + 28, y - 4, oneSpec, '#10131f', {
      hlBg: '#ffd225',
      normalWeight: 700,
      boldWeight: 900,
      hlRadius: 0,
    });
    y += Math.max(104, oneLaid.lines.length * oneLaid.lineH + 30);

    const sectionLabels = ['新闻事实', '为什么重要', '对你的影响'];
    const cardGap = 20;
    const bulletValSize = Math.max(36, Math.min(42, 42 - shrinkLevel * 2));

    for (let i = 0; i < d.bullets.length; i++) {
      const b = d.bullets[i];
      const fill = i === 1 ? '#ffd225' : '#f7f3ea';

      const valSpec = (s, w) => `${w || 500} ${s}px ${FF_CN}`;
      const valText = truncateText(b.v, d.posterMaxChars || 92);
      const valLaidRaw = layoutTokens(ctx, [{ text: valText }], valSpec, bulletValSize, 1.34, CW - 76);
      // 卡片高度随内容自适应 —— 与 measureSinglePoster() 同一公式，
      // 不再把三张卡拉伸去填满固定档位（旧逻辑会让短内容的卡片留大片空白）。
      const textH = valLaidRaw.lines.length * valLaidRaw.lineH;
      const cardH = Math.max(300, Math.min(560, 176 + textH));
      const maxLines = Math.max(3, Math.floor((cardH - 118) / (bulletValSize * 1.34)));
      const valLaid = clampLaidOut(ctx, valLaidRaw, valSpec, maxLines, CW - 76);

      drawSharpBox(ctx, CX, y, CW, cardH, fill, '#10131f', 8);

      ctx.font = `900 48px ${FF_CN}`;
      ctx.fillStyle = '#10131f';
      ctx.fillText(sectionLabels[i] || b.k, CX + 28, y + 66);

      drawLaidOut(ctx, valLaid, CX + 28, y + 94, valSpec, '#262936', {
        normalWeight: 500,
        boldWeight: 800,
        hlBg: 'transparent',
      });

      y += cardH + cardGap;
    }

    drawFooter(ctx, CX, H - 226, CW, d.src, articleUrl);
  }

  /* =========================== 合集海报（flex-height） =========================== */

  // Summary item 布局常量（给 measure + draw 共享）
  const SUMMARY_TITLE_SIZE = 44;
  const SUMMARY_TITLE_LINEH = 1.32;
  const SUMMARY_ITEM_PAD_Y = 26;
  const SUMMARY_ITEM_GAP = 20;
  const SUMMARY_ITEM_CAT_H = 42;    // 分类标签高度区
  const SUMMARY_ITEM_MIN_H = 130;
  const SUMMARY_ITEM_NUM_LEFT = 120; // 标题相对卡片左侧的偏移

  function layoutSummaryItem(ctx, it, CW) {
    const titleMaxW = CW - SUMMARY_ITEM_NUM_LEFT - 36;
    const tSpec = (s, w) => `${w || 900} ${s}px ${FF_CN}`;
    const tLaid = layoutTokens(
      ctx, [{ text: it.t }], tSpec,
      SUMMARY_TITLE_SIZE, SUMMARY_TITLE_LINEH, titleMaxW
    );
    const contentH = SUMMARY_ITEM_PAD_Y + SUMMARY_ITEM_CAT_H + 10 +
                     tLaid.lines.length * tLaid.lineH + SUMMARY_ITEM_PAD_Y;
    const itemH = Math.max(contentH, SUMMARY_ITEM_MIN_H);
    return { tLaid, tSpec, titleMaxW, itemH };
  }

  function measureSummaryPoster(ctx, s) {
    // 必须严格对齐 drawSummaryPoster 的实际排版（118px 紧凑行版式），
    // 否则 canvas 高度比内容多出几百 px → 封面下半部分一片空白。
    let y = 132;

    // 顶部 boxes（黄色 HIGHLIGHT + 右侧 NEWS LIST），固定 118 高 + 间距
    y += 184;

    // Hero "X月X日\nAI 新闻榜，\n5 条必看。" — 永远 3 行 86px (lineH 1.08)
    y += Math.ceil(3 * 86 * 1.08) + 28;

    // italic 'what changed today, why it matters, and what to watch next.'
    y += 92;

    // '头条：xxx 这条线最值得先看。'
    y += 50;

    // 头条高亮黄条 + 标题：按实际文字宽度算行数（draw 用的是 CW-180 = 918px 包裹宽）
    const firstItem = (s.items && s.items[0]) || {};
    const firstSpec = (size, w) => `${w || 900} ${size}px ${FF_CN}`;
    const firstLaid = layoutTokens(
      ctx, [{ text: firstItem.t || 'AI 新闻摘要' }], firstSpec,
      34, 1.2, (W - 144) - 180
    );
    y += firstLaid.lines.length * firstLaid.lineH + 16 + 32;

    // 5 个 item 行，每行固定 118 高 + 14 间距
    y += 5 * (118 + 14);

    // 底部分割线 (在 H-82) + 品牌行 (在 H-34) + 安全留白
    y += 110;

    return Math.ceil(y);
  }

  function drawSummaryPoster(ctx, s, DATE, articleUrl, H) {
    ctx.clearRect(0, 0, W, H);
    drawShell(ctx, {}, H);
    drawMarsHeader(ctx, DATE, 'TOP 5');

    const CX = 72;
    const CW = W - 144;
    let y = 132;
    const firstItem = s.items && s.items[0] ? s.items[0] : {};

    drawSharpBox(ctx, CX, y, 650, 118, '#ffd225', '#10131f', 8);
    ctx.font = `900 28px ${FF_MONO}`;
    ctx.fillStyle = '#10131f';
    ctx.fillText('今日 AI 日历 · HIGHLIGHT', CX + 28, y + 44);
    ctx.font = `900 40px ${FF_CN}`;
    ctx.fillText('5 条新闻，按影响力排序。', CX + 28, y + 92);

    drawSharpBox(ctx, W - 470, y, 398, 118, '#f7f3ea', '#10131f', 0);
    ctx.font = `900 24px ${FF_CN}`;
    ctx.fillStyle = '#10131f';
    ctx.fillText('JR Academy / AI Daily', W - 442, y + 40);
    ctx.font = `700 22px ${FF_MONO}`;
    ctx.fillStyle = '#e5261f';
    ctx.fillText('NEWS LIST · TOP 5', W - 442, y + 76);
    ctx.fillStyle = '#565967';
    ctx.fillText('MODEL · PRODUCT · MARKET', W - 442, y + 104);

    y += 184;
    const titleSpec = (s, w) => `${w || 900} ${s}px ${FF_CN}`;
    const m = DATE.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const dateTitle = m ? `${Number(m[2])}月${Number(m[3])}日` : DATE;
    const heroTokens = [
      { text: `${dateTitle}\nAI 新闻榜，\n` },
      { text: '5 条必看', hl: true },
      { text: '。' },
    ];
    const heroLaid = layoutTokens(ctx, heroTokens, titleSpec, 86, 1.08, CW);
    drawLaidOut(ctx, heroLaid, CX, y, titleSpec, '#10131f', {
      hlBg: '#ffd225',
      hlPadX: 10,
      hlPadY: 4,
      hlRadius: 0,
      normalWeight: 900,
    });
    y += heroLaid.lines.length * heroLaid.lineH + 28;

    ctx.font = `italic 34px Georgia, serif`;
    ctx.fillStyle = '#777a84';
    ctx.fillText('what changed today, why it matters, and what to watch next.', CX, y + 34);
    y += 92;

    ctx.font = `900 34px ${FF_CN}`;
    ctx.fillStyle = '#10131f';
    ctx.fillText(`头条：${firstItem.cat || 'AI'} 这条线最值得先看。`, CX, y);
    y += 50;
    ctx.fillStyle = '#ffd225';
    ctx.fillRect(CX, y - 34, Math.min(CW - 170, 760), 46);
    ctx.fillStyle = '#10131f';
    ctx.font = `900 34px ${FF_CN}`;
    const firstLaid = layoutTokens(ctx, [{ text: firstItem.t || 'AI 新闻摘要' }], (s, w) => `${w || 900} ${s}px ${FF_CN}`, 34, 1.2, CW - 180);
    drawLaidOut(ctx, firstLaid, CX + 8, y - 34, (s, w) => `${w || 900} ${s}px ${FF_CN}`, '#10131f', {
      hlBg: 'transparent',
      normalWeight: 900,
    });
    y += firstLaid.lines.length * firstLaid.lineH + 16;
    y += 32;
    for (let i = 0; i < 5; i++) {
      const it = s.items[i] || {};
      const rowH = 118;
      const fill = i === 0 ? '#ffd225' : '#f7f3ea';
      drawSharpBox(ctx, CX, y, CW, rowH, fill, '#10131f', i === 0 ? 8 : 0);
      ctx.font = `900 54px ${FF_MONO}`;
      ctx.fillStyle = it.numColor || '#10131f';
      ctx.fillText(it.num || String(i + 1).padStart(2, '0'), CX + 28, y + 76);
      ctx.font = `900 27px ${FF_CN}`;
      ctx.fillStyle = '#e5261f';
      ctx.fillText(it.cat || 'AI 新闻', CX + 118, y + 42);
      ctx.font = `900 34px ${FF_CN}`;
      ctx.fillStyle = '#10131f';
      const rowSpec = (s, w) => `${w || 900} ${s}px ${FF_CN}`;
      const laidRaw = layoutTokens(ctx, [{ text: it.t || '' }], rowSpec, 34, 1.16, CW - 160);
      const laid = clampLaidOut(ctx, laidRaw, rowSpec, 2, CW - 160);
      drawLaidOut(ctx, laid, CX + 118, y + 48, rowSpec, '#10131f', { hlBg: 'transparent' });
      y += rowH + 14;
    }

    ctx.strokeStyle = '#10131f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(CX, H - 82);
    ctx.lineTo(CX + CW, H - 82);
    ctx.stroke();
    ctx.font = `700 20px ${FF_MONO}`;
    ctx.fillStyle = '#565967';
    ctx.fillText('JR ACADEMY · AI DAILY', CX, H - 34);
    const issue = '#AI-CALENDAR · TOP 5';
    const iw = ctx.measureText(issue).width;
    ctx.fillText(issue, CX + CW - iw, H - 34);
  }

  /* =========================== Footer =========================== */

  function drawFooter(ctx, cx, y, cw, srcText, articleUrl) {
    ctx.strokeStyle = '#10162f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx + cw, y);
    ctx.stroke();

    const qrSize = 168;
    const qrX = cx + cw - qrSize;
    const qrY = y + 14;

    ctx.textBaseline = 'alphabetic';
    ctx.font = `700 28px ${FF_MONO}`;
    ctx.fillStyle = '#64748b';
    const srcMaxW = cw - qrSize - 24;
    let src = srcText;
    while (ctx.measureText(src).width > srcMaxW && src.length > 4) {
      src = src.slice(0, -2);
    }
    if (src !== srcText) src = src.slice(0, -1) + '…';
    ctx.fillText(src, cx, y + 48);

    ctx.font = `900 44px ${FF_CN}`;
    ctx.fillStyle = '#10162f';
    ctx.fillText('匠人学院', cx, y + 48 + 52);
    const brandW = ctx.measureText('匠人学院').width;
    ctx.font = `900 44px ${FF_CN}`;
    ctx.fillStyle = '#ff5757';
    ctx.fillText(' · AI 日报', cx + brandW, y + 48 + 52);

    ctx.font = `700 22px ${FF_MONO}`;
    ctx.fillStyle = '#64748b';
    ctx.fillText('扫码看完整报道 →', cx, y + 48 + 52 + 44);

    drawQR(ctx, qrX, qrY, qrSize, articleUrl);
  }

  /* =========================== 页面外壳（与 v1 一致） =========================== */

  const PAGE_STYLES = `
:root {
  --brand-red: #ff5757;
  --brand-dark: #10162f;
  --brand-yellow: #ffce44;
  --bg-cream: #fff1e7;
  --text-gray: #64748b;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: "Noto Sans SC", system-ui, sans-serif;
  background: linear-gradient(180deg, #fff 0%, #fff4e7 100%);
  color: var(--brand-dark);
  padding: 36px 20px 120px;
  min-height: 100vh;
}
.pr-wrap { max-width: 1680px; margin: 0 auto; }
.pr-header { text-align: center; margin-bottom: 40px; }
.pr-header h1 {
  font-size: 32px; font-weight: 900; letter-spacing: -0.5px;
  margin-bottom: 8px;
}
.pr-header h1 em {
  font-style: normal; color: var(--brand-red);
  background: var(--brand-yellow); padding: 2px 12px; border-radius: 4px;
}
.pr-header p {
  font-size: 15px; color: var(--text-gray); line-height: 1.7;
}
.pr-header p code {
  background: #fff8ee; padding: 1px 7px; border-radius: 4px;
  font-family: "JetBrains Mono", monospace; font-size: 13px;
  border: 1px solid #ffe7b3;
}
.pr-actions-bar {
  display: flex; justify-content: center; align-items: center;
  flex-wrap: wrap; gap: 12px;
  margin: 24px auto 40px;
}
.pr-btn {
  font-family: "Noto Sans SC", sans-serif;
  font-size: 14px; font-weight: 800;
  padding: 12px 22px;
  border: 2px solid var(--brand-dark);
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 4px 4px 0 var(--brand-dark);
  transition: all 0.12s;
  background: #fff; color: var(--brand-dark);
}
.pr-btn:hover:not(:disabled) {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--brand-dark);
}
.pr-btn:disabled { opacity: 0.5; cursor: wait; }
.pr-btn.primary { background: var(--brand-red); color: #fff; }
.pr-btn.ghost { background: #fff; color: var(--brand-dark); }
.pr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 520px), 1fr));
  gap: 32px;
}
.pr-frame {
  background: #fff;
  border: 2px solid var(--brand-dark);
  border-radius: 16px;
  padding: 18px;
  box-shadow: 6px 6px 0 var(--brand-dark);
  display: flex; flex-direction: column;
}
.pr-frame-label {
  font-family: "JetBrains Mono", monospace;
  font-size: 13px; font-weight: 700;
  color: var(--brand-dark);
  margin-bottom: 6px;
}
.pr-frame-label em {
  font-style: normal; color: var(--brand-red); font-weight: 700;
}
.pr-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.pr-meta span {
  font-size: 11px; font-weight: 700;
  padding: 3px 10px;
  background: var(--bg-cream);
  border: 1.5px solid var(--brand-dark);
  border-radius: 100px;
  color: var(--brand-dark);
  font-family: "JetBrains Mono", monospace;
}
.pr-canvas-wrap {
  background: #eef0f4;
  border-radius: 10px;
  padding: 16px;
  display: flex; justify-content: center;
  cursor: zoom-in;
}
.pr-canvas-wrap canvas {
  width: 100%;
  max-width: 620px;
  height: auto;
  display: block;
  box-shadow: 8px 8px 0 var(--brand-dark);
  border-radius: 8px;
  background: #fff;
}
.pr-card-actions { margin-top: 14px; display: flex; gap: 8px; }
.pr-card-actions .pr-btn { flex: 1; font-size: 13px; padding: 10px 12px; }
.pr-footer {
  text-align: center; margin-top: 60px;
  font-size: 12px; color: var(--text-gray);
}
.pr-footer a { color: var(--brand-red); text-decoration: none; font-weight: 700; }
.pr-footer code {
  background: #fff8ee; padding: 1px 6px; border-radius: 3px;
  font-family: "JetBrains Mono", monospace; font-size: 11px;
}
.pr-lightbox {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(16,22,47,0.85);
  display: none; align-items: center; justify-content: center;
  padding: 24px;
}
.pr-lightbox.is-open { display: flex; }
.pr-lightbox-inner { position: relative; max-width: 92vw; max-height: 92vh; }
.pr-lightbox-inner img {
  max-width: 100%; max-height: 92vh;
  display: block; border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
.pr-lightbox-close {
  position: absolute; top: -40px; right: 0;
  background: #fff; color: var(--brand-dark);
  border: 2px solid var(--brand-dark);
  padding: 6px 14px; border-radius: 8px;
  font-size: 14px; font-weight: 800; cursor: pointer;
}
.pr-toast {
  position: fixed; right: 20px; bottom: 24px;
  background: var(--brand-dark); color: #fff;
  padding: 14px 20px; border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.25);
  font-size: 14px; opacity: 0;
  transform: translateY(20px);
  transition: all 0.25s;
  pointer-events: none;
  max-width: 320px;
  z-index: 10000;
}
.pr-toast.is-show { opacity: 1; transform: translateY(0); }
.pr-toast strong { display: block; font-weight: 900; margin-bottom: 2px; }
.pr-toast span { font-size: 13px; opacity: 0.88; }
`;

  function injectStyles() {
    if (document.getElementById('poster-renderer-styles')) return;
    const s = document.createElement('style');
    s.id = 'poster-renderer-styles';
    s.textContent = PAGE_STYLES;
    document.head.appendChild(s);
  }

  function injectFonts() {
    if (document.getElementById('poster-renderer-fonts')) return;
    const pre1 = document.createElement('link');
    pre1.rel = 'preconnect'; pre1.href = 'https://fonts.googleapis.com';
    const pre2 = document.createElement('link');
    pre2.rel = 'preconnect'; pre2.href = 'https://fonts.gstatic.com'; pre2.crossOrigin = '';
    const f = document.createElement('link');
    f.id = 'poster-renderer-fonts';
    f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700;900&family=JetBrains+Mono:wght@400;700&family=Bricolage+Grotesque:wght@900&display=swap';
    document.head.appendChild(pre1);
    document.head.appendChild(pre2);
    document.head.appendChild(f);
  }

  function renderPageShell(DATE, articleUrl, opts) {
    const wrap = document.createElement('div');
    wrap.className = 'pr-wrap';
    wrap.innerHTML = `
      <header class="pr-header">
        <h1>${opts.title || 'AI 每日头条海报'} · ${DATE} <em>Canvas v2</em></h1>
        <p>
          6 张海报由 <code>Canvas 2D</code> 原生绘制 · 自动选高度（flex-height）<br>
          扫码直达 <code>${articleUrl.replace(/^https?:\/\//, '')}</code>
        </p>
      </header>
      <div class="pr-actions-bar">
        <button class="pr-btn primary" id="pr-download-all">⬇ 一键下载全部 PNG</button>
        <button class="pr-btn ghost" id="pr-copy-url">📋 复制文章链接</button>
      </div>
      <main>
        <div class="pr-grid" id="pr-grid"></div>
      </main>
      <footer class="pr-footer">
        ${opts.title || 'AI 每日头条'} · ${DATE} · 6 张海报 · 1242×flex · <a href="../">← AI 海报 hub</a><br>
        Canvas 2D · v2 flex-height · 二维码 → <code>${articleUrl.replace(/^https?:\/\//, '')}</code>
      </footer>
    `;
    document.body.appendChild(wrap);

    const lb = document.createElement('div');
    lb.className = 'pr-lightbox';
    lb.id = 'pr-lightbox';
    lb.setAttribute('aria-hidden', 'true');
    lb.innerHTML = `
      <div class="pr-lightbox-inner">
        <button class="pr-lightbox-close" id="pr-lightbox-close" type="button">关闭 ✕</button>
        <img id="pr-lightbox-img" alt="海报预览">
      </div>
    `;
    document.body.appendChild(lb);

    const toast = document.createElement('div');
    toast.className = 'pr-toast';
    toast.id = 'pr-toast';
    toast.innerHTML = '<strong id="pr-toast-title"></strong><span id="pr-toast-text"></span>';
    document.body.appendChild(toast);
  }

  function mountCards(posters, heights) {
    const grid = document.getElementById('pr-grid');
    for (let i = 0; i < posters.length; i++) {
      const p = posters[i];
      const h = heights[i] || DEFAULT_H;
      const card = document.createElement('div');
      card.className = 'pr-frame';
      card.innerHTML = `
        <div class="pr-frame-label">${p.frameLabel || p.slug}</div>
        <div class="pr-meta">${(p.tags || []).map(t => `<span>${t}</span>`).join('')}</div>
        <div class="pr-canvas-wrap" data-preview="${p.slug}">
          <canvas data-id="${p.slug}" width="${W}" height="${h}"></canvas>
        </div>
        <div class="pr-card-actions">
          <button class="pr-btn ghost" data-preview-btn="${p.slug}" type="button">👁 放大预览</button>
          <button class="pr-btn primary" data-dl="${p.slug}" type="button">⬇ 下载 PNG</button>
        </div>
      `;
      grid.appendChild(card);
    }
  }

  function downloadOne(slug, DATE) {
    const c = document.querySelector(`canvas[data-id="${slug}"]`);
    if (!c) return;
    const a = document.createElement('a');
    a.download = `ai-news-${DATE}-${slug}.png`;
    a.href = c.toDataURL('image/png');
    a.click();
  }

  function showToast(title, text) {
    const t = document.getElementById('pr-toast');
    document.getElementById('pr-toast-title').textContent = title;
    document.getElementById('pr-toast-text').textContent = text;
    t.classList.add('is-show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('is-show'), 2200);
  }

  function bindEvents(posters, DATE, articleUrl) {
    document.getElementById('pr-download-all').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      const old = btn.textContent;
      btn.textContent = '下载中...';
      showToast('开始批量下载', '将按顺序导出 ' + posters.length + ' 张 PNG');
      for (const p of posters) {
        downloadOne(p.slug, DATE);
        await new Promise(r => setTimeout(r, 260));
      }
      btn.textContent = old;
      btn.disabled = false;
      showToast('批量下载完成', posters.length + ' 张 PNG 已触发下载');
    });

    document.getElementById('pr-copy-url').addEventListener('click', () => {
      navigator.clipboard.writeText(articleUrl).then(() => {
        showToast('已复制', articleUrl);
      });
    });

    document.addEventListener('click', (e) => {
      const dl = e.target.closest('[data-dl]');
      if (dl) {
        downloadOne(dl.dataset.dl, DATE);
        showToast('已开始下载', dl.dataset.dl);
        return;
      }
      const preview = e.target.closest('[data-preview]') || e.target.closest('[data-preview-btn]');
      if (preview) {
        const slug = preview.dataset.preview || preview.dataset.previewBtn;
        const c = document.querySelector(`canvas[data-id="${slug}"]`);
        if (c) {
          document.getElementById('pr-lightbox-img').src = c.toDataURL('image/png');
          document.getElementById('pr-lightbox').classList.add('is-open');
        }
      }
      if (e.target.id === 'pr-lightbox-close' || e.target.id === 'pr-lightbox') {
        document.getElementById('pr-lightbox').classList.remove('is-open');
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') document.getElementById('pr-lightbox').classList.remove('is-open');
    });
  }

  /* =========================== 入口 =========================== */

  async function renderAll(config) {
    const { DATE, SUMMARY, NEWS } = config;
    if (!DATE || !SUMMARY || !NEWS) {
      throw new Error('PosterRenderer.renderAll: DATE / SUMMARY / NEWS 必填');
    }
    const articleUrl = config.articleUrl || `https://jiangren.com.au/blog/ai-daily-${DATE}`;
    const title = config.title || 'AI 每日头条海报';
    const flexHeight = !!config.FLEX_HEIGHT;
    const tiers = config.HEIGHT_TIERS || DEFAULT_HEIGHT_TIERS;
    const overflowFallback = config.OVERFLOW_FALLBACK || 'shrink';

    injectFonts();
    injectStyles();
    renderPageShell(DATE, articleUrl, { title });

    // 先把字体 ready，再 measure（否则字号会错）
    try { await document.fonts.ready; } catch {}

    // 预计算每张海报的高度
    const offscreen = document.createElement('canvas');
    offscreen.width = W;
    offscreen.height = DEFAULT_H;
    const mctx = offscreen.getContext('2d');

    const heights = [];
    const shrinkLevels = [];

    // SUMMARY 也走 flex
    if (flexHeight) {
      const required = measureSummaryPoster(mctx, SUMMARY);
      heights.push(Math.max(required, 1400));
    } else {
      heights.push(DEFAULT_H);
    }
    shrinkLevels.push(0);

    // 单图 NEWS：高度完全随内容自适应（与 SUMMARY 一致），不再 snap 到离散档位。
    // 旧的 HEIGHT_TIERS / selectHeightTier 会把内容向上取整到最近档位，
    // 短内容留白、长内容被 shrink 压扁；现在直接用 measure 出的精确高度。
    for (const p of NEWS) {
      if (!flexHeight) {
        heights.push(DEFAULT_H);
        shrinkLevels.push(0);
        continue;
      }
      const required = measureSinglePoster(mctx, p, 0);
      heights.push(Math.max(required, 1400));
      shrinkLevels.push(0);
    }

    mountCards([SUMMARY, ...NEWS], heights);
    bindEvents([SUMMARY, ...NEWS], DATE, articleUrl);

    for (let i = 0; i < 1 + NEWS.length; i++) {
      const p = i === 0 ? SUMMARY : NEWS[i - 1];
      const c = document.querySelector(`canvas[data-id="${p.slug}"]`);
      if (!c) continue;
      const H = heights[i];
      c.height = H;
      const ctx = c.getContext('2d');
      if (i === 0) drawSummaryPoster(ctx, SUMMARY, DATE, articleUrl, H);
      else drawSinglePoster(ctx, p, DATE, articleUrl, H, shrinkLevels[i]);
    }
  }

  window.PosterRenderer = {
    renderAll,
    _internal: {
      drawSinglePoster, drawSummaryPoster, drawFooter, drawShell, drawQR,
      measureSinglePoster, selectHeightTier,
      layoutTokens, fitText, roundRectPath,
      CONST: { W, DEFAULT_H, DEFAULT_HEIGHT_TIERS, OUTER, BORDER, RADIUS, PAD_X, PAD_Y, FF_CN, FF_MONO, FF_DISPLAY },
    },
    version: 'v2',
  };
})();
