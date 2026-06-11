/**
 * 一人公司搞钱周报 · 海报渲染器（独立版 v1）
 *
 * 不复用 ai-news-posters 的 v1/v2/v3（那套是日报的 neo-brutalism 老风格）。
 * 视觉对齐 jr-academy-brand v4.2：
 *   暖白底 #FFFCF6 · 卡片 #FFFDF8 + 浅橙细边 #F3D8B5 · 黑 #0D0F12 主标识
 *   红 #FF4D4F 只做编号/强调/紧急 · 紫 #7B61FF 做分类 tag
 *   大面板 16px / 小元素 8px 圆角 · 无黑粗边 offset 阴影
 *
 * 高度完全自适应：先 measure 后 draw，canvas 高度 = 实际内容高度。
 *
 * 页面用法（薄壳页只放数据）：
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>
 *   <script src="renderer.js"></script>
 *   <script>WeeklyPoster.renderAll(POSTER_DATA);</script>
 */
(function () {
  'use strict';

  /* ====================== 常量（brand v4.2） ====================== */

  const W = 1242;
  const PAD = 84; // 画布左右留白
  const CW = W - PAD * 2;

  const C = {
    canvas: '#FFFCF6',
    card: '#FFFDF8',
    border: '#F3D8B5',
    black: '#0D0F12',
    red: '#FF4D4F',
    purple: '#7B61FF',
    purpleBg: '#F1EDFF',
    text: '#1F232B',
    sub: '#6B7280',
    faint: '#9CA3AF',
  };

  const FF_CN = '"Noto Sans SC", "PingFang SC", system-ui, sans-serif';
  const FF_MONO = '"JetBrains Mono", "SF Mono", Menlo, monospace';

  const R_PANEL = 16;
  const R_SM = 8;

  /* ====================== 基础画法 ====================== */

  function rr(ctx, x, y, w, h, r) {
    const v = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + v, y);
    ctx.arcTo(x + w, y, x + w, y + h, v);
    ctx.arcTo(x + w, y + h, x, y + h, v);
    ctx.arcTo(x, y + h, x, y, v);
    ctx.arcTo(x, y, x + w, y, v);
    ctx.closePath();
  }

  function card(ctx, x, y, w, h, radius) {
    ctx.fillStyle = C.card;
    rr(ctx, x, y, w, h, radius);
    ctx.fill();
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 2;
    rr(ctx, x + 1, y + 1, w - 2, h - 2, radius);
    ctx.stroke();
  }

  // 中英混排逐字符折行（中文无空格，必须按字符断）
  function wrapText(ctx, text, font, maxW) {
    ctx.font = font;
    const lines = [];
    let line = '';
    for (const ch of String(text)) {
      if (ch === '\n') { lines.push(line); line = ''; continue; }
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawWrapped(ctx, text, font, color, x, y, maxW, lineH) {
    const lines = wrapText(ctx, text, font, maxW);
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textBaseline = 'alphabetic';
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
    return lines.length * lineH;
  }

  function measureWrapped(ctx, text, font, maxW, lineH) {
    return wrapText(ctx, text, font, maxW).length * lineH;
  }

  // 富文本 segments（{text, hl?}）整行布局：hl 段用红色
  function drawSegLine(ctx, segs, size, weight, x, y, hlColor) {
    let cx = x;
    for (const s of segs) {
      ctx.font = `${s.hl ? 900 : weight} ${size}px ${FF_CN}`;
      ctx.fillStyle = s.hl ? (hlColor || C.red) : C.black;
      ctx.fillText(s.text, cx, y);
      cx += ctx.measureText(s.text).width;
    }
  }

  function segWidth(ctx, segs, size, weight) {
    let w = 0;
    for (const s of segs) {
      ctx.font = `${s.hl ? 900 : weight} ${size}px ${FF_CN}`;
      w += ctx.measureText(s.text).width;
    }
    return w;
  }

  function tag(ctx, text, x, y, opts) {
    const o = opts || {};
    const fs = o.size || 26;
    ctx.font = `700 ${fs}px ${FF_CN}`;
    const tw = ctx.measureText(text).width;
    const ph = o.padH || 18, pv = o.padV || 12;
    const w = tw + ph * 2, h = fs + pv * 2;
    ctx.fillStyle = o.bg || C.purpleBg;
    rr(ctx, x, y, w, h, R_SM);
    ctx.fill();
    if (o.border) {
      ctx.strokeStyle = o.border;
      ctx.lineWidth = 1.5;
      rr(ctx, x, y, w, h, R_SM);
      ctx.stroke();
    }
    ctx.fillStyle = o.color || C.purple;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x + ph, y + pv + fs - fs * 0.18);
    return { w, h };
  }

  function drawQR(ctx, x, y, size, url) {
    if (typeof qrcode === 'undefined') return;
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    const n = qr.getModuleCount();
    const cell = size / n;
    ctx.fillStyle = '#fff';
    rr(ctx, x - 12, y - 12, size + 24, size + 24, R_SM);
    ctx.fill();
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 2;
    rr(ctx, x - 12, y - 12, size + 24, size + 24, R_SM);
    ctx.stroke();
    ctx.fillStyle = C.black;
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (qr.isDark(r, c)) ctx.fillRect(x + c * cell, y + r * cell, Math.ceil(cell), Math.ceil(cell));
  }

  /* ====================== 公共 header / footer ====================== */

  const HEADER_H = 150;

  function drawHeader(ctx, date, kickerRight) {
    // 黑色细条 = 唯一主标识用法（brand：黑做 logo/主标识）
    ctx.fillStyle = C.black;
    ctx.fillRect(0, 0, W, 8);

    ctx.textBaseline = 'alphabetic';
    ctx.font = `900 40px ${FF_CN}`;
    ctx.fillStyle = C.black;
    ctx.fillText('匠人学院', PAD, 92);
    const bw = ctx.measureText('匠人学院').width;
    ctx.font = `700 26px ${FF_MONO}`;
    ctx.fillStyle = C.sub;
    ctx.fillText('JR ACADEMY', PAD + bw + 20, 90);

    ctx.font = `600 26px ${FF_MONO}`;
    ctx.fillStyle = C.faint;
    const right = `${kickerRight} · ${date}`;
    const rw = ctx.measureText(right).width;
    ctx.fillText(right, W - PAD - rw, 90);

    ctx.strokeStyle = C.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD, 126);
    ctx.lineTo(W - PAD, 126);
    ctx.stroke();
  }

  const FOOTER_H = 250;

  function drawFooter(ctx, y, articleUrl, leftNote) {
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();

    const qrSize = 150;
    drawQR(ctx, W - PAD - qrSize, y + 38, qrSize, articleUrl);

    ctx.textBaseline = 'alphabetic';
    if (leftNote) {
      ctx.font = `700 26px ${FF_MONO}`;
      ctx.fillStyle = C.sub;
      ctx.fillText(leftNote, PAD, y + 64);
    }
    ctx.font = `900 46px ${FF_CN}`;
    ctx.fillStyle = C.black;
    ctx.fillText('学 AI 来匠人', PAD, y + 130);
    ctx.font = `600 26px ${FF_CN}`;
    ctx.fillStyle = C.sub;
    ctx.fillText('扫码看完整周报和报名链接 → jiangren.com.au', PAD, y + 178);
  }

  /* ====================== 合集海报 ====================== */

  const ITEM_TITLE_FONT = `700 38px ${FF_CN}`;
  const ITEM_TITLE_LH = 54;
  const ITEM_META_H = 46;

  function measureItem(ctx, it) {
    // 卡片内：tag 行(44) + 间距(26) + 标题行数 + 间距(20) + meta 行(46) + 上下 padding(36*2)
    const titleH = measureWrapped(ctx, it.title, ITEM_TITLE_FONT, CW - 96 - 130, ITEM_TITLE_LH);
    return 44 + 26 + titleH + 20 + ITEM_META_H + 72;
  }

  function drawItem(ctx, it, y) {
    const h = measureItem(ctx, it);
    card(ctx, PAD, y, CW, h, R_PANEL);

    const innerX = PAD + 48;
    let cy = y + 36;

    // 编号（红，brand：红只做编号/强调）
    ctx.font = `900 64px ${FF_MONO}`;
    ctx.fillStyle = C.red;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(it.num, innerX, cy + 56);

    // 分类 tag（紫）
    tag(ctx, it.tag, innerX + 130, cy, { size: 24, padV: 10 });

    // 紧急角标
    if (it.urgent) {
      ctx.font = `800 26px ${FF_CN}`;
      const uw = ctx.measureText(it.urgent).width;
      ctx.fillStyle = C.red;
      ctx.fillText(it.urgent, PAD + CW - 48 - uw, cy + 34);
    }

    cy += 44 + 26;

    // 标题（黑，留出左侧编号宽度）
    const titleX = innerX + 130;
    const titleH = drawWrapped(ctx, it.title, ITEM_TITLE_FONT, C.text, titleX, cy + 38, CW - 96 - 130, ITEM_TITLE_LH);
    cy += titleH + 20;

    // meta 行：奖金（红强调） + deadline（mono 灰）
    ctx.font = `800 32px ${FF_CN}`;
    ctx.fillStyle = C.red;
    ctx.fillText(it.prize, titleX, cy + 32);
    const pw = ctx.measureText(it.prize).width;
    ctx.font = `600 28px ${FF_MONO}`;
    ctx.fillStyle = C.sub;
    ctx.fillText('· ' + it.deadline, titleX + pw + 18, cy + 31);

    return h;
  }

  function measureSummary(ctx, d) {
    let total = HEADER_H;
    // hero kicker tag 行
    total += 64;
    // hero title 行
    total += d.hero.titleLines.length * 108 + 12;
    // sub
    total += measureWrapped(ctx, d.hero.sub, `500 32px ${FF_CN}`, CW, 48) + 44;
    // items
    for (const it of d.items) total += measureItem(ctx, it) + 28;
    total += 30 + FOOTER_H;
    return total;
  }

  function drawSummary(canvas, d) {
    const ctx = canvas.getContext('2d');
    const H = canvas.height;
    ctx.fillStyle = C.canvas;
    ctx.fillRect(0, 0, W, H);

    drawHeader(ctx, d.date, d.hero.kicker);

    let y = HEADER_H;

    // hero kicker tag（紫小 tag，点出栏目名）
    tag(ctx, d.hero.tagline, PAD, y, { size: 26 });
    y += 64;

    // hero 大标题（黑 + 红强调段）
    for (const line of d.hero.titleLines) {
      y += 96;
      drawSegLine(ctx, line, 84, 900, PAD, y);
      y += 12;
    }
    y += 26;

    // sub
    y += drawWrapped(ctx, d.hero.sub, `500 32px ${FF_CN}`, C.sub, PAD, y + 18, CW, 48) + 44;

    // items
    for (const it of d.items) {
      y += drawItem(ctx, it, y) + 28;
    }

    drawFooter(ctx, y + 2, d.articleUrl, d.footerNote);
  }

  /* ====================== 单张机会海报 ====================== */

  const FACT_K_H = 40;
  const FACT_V_FONT = `500 36px ${FF_CN}`;
  const FACT_V_LH = 56;

  function measureFact(ctx, f) {
    const vH = measureWrapped(ctx, f.v, FACT_V_FONT, CW - 96, FACT_V_LH);
    return 40 + FACT_K_H + 14 + vH + 40;
  }

  function measureSingle(ctx, n) {
    let total = HEADER_H + 24;
    total += 56; // tag 行
    for (const line of n.titleLines) total += 86 + 8;
    total += 30;
    total += measureWrapped(ctx, n.oneline, `600 36px ${FF_CN}`, CW - 40, 56) + 56;
    for (const f of n.facts) total += measureFact(ctx, f) + 26;
    total += 28 + FOOTER_H;
    return total;
  }

  function drawSingle(canvas, n, d) {
    const ctx = canvas.getContext('2d');
    const H = canvas.height;
    ctx.fillStyle = C.canvas;
    ctx.fillRect(0, 0, W, H);

    drawHeader(ctx, d.date, `${n.idx} / ${String(d.news.length).padStart(2, '0')}`);

    let y = HEADER_H + 24;

    // 分类 tag + 紧急标
    const t = tag(ctx, n.tag, PAD, y, { size: 26 });
    if (n.urgent) {
      ctx.font = `800 28px ${FF_CN}`;
      ctx.fillStyle = C.red;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(n.urgent, PAD + t.w + 24, y + 40);
    }
    y += 56;

    // 大标题
    for (const line of n.titleLines) {
      y += 76;
      drawSegLine(ctx, line, 64, 900, PAD, y);
      y += 18;
    }
    y += 12;

    // oneline（左侧红竖条 = 强调）
    ctx.fillStyle = C.red;
    rr(ctx, PAD, y + 6, 8, measureWrapped(ctx, n.oneline, `600 36px ${FF_CN}`, CW - 40, 56) - 8, 4);
    ctx.fill();
    y += drawWrapped(ctx, n.oneline, `600 36px ${FF_CN}`, C.text, PAD + 32, y + 40, CW - 40, 56) + 56;

    // facts 卡片
    for (const f of n.facts) {
      const fh = measureFact(ctx, f);
      card(ctx, PAD, y, CW, fh, R_PANEL);
      let cy = y + 40;
      // k 标签：紫 tag 风格的小字头
      ctx.font = `800 30px ${FF_CN}`;
      ctx.fillStyle = C.purple;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(f.k, PAD + 48, cy + 28);
      cy += FACT_K_H + 14;
      drawWrapped(ctx, f.v, FACT_V_FONT, C.text, PAD + 48, cy + 36, CW - 96, FACT_V_LH);
      y += fh + 26;
    }

    drawFooter(ctx, y + 2, d.articleUrl, n.src);
  }

  /* ====================== 页面 shell + 下载 ====================== */

  function injectStyles() {
    const css = `
      body { margin:0; background:#EFEAE0; font-family:${FF_CN}; }
      .wp-head { max-width:1000px; margin:28px auto 8px; padding:0 16px; }
      .wp-head h1 { font-size:22px; color:#0D0F12; margin:0 0 6px; }
      .wp-head p { font-size:14px; color:#6B7280; margin:0; }
      .wp-list { max-width:1000px; margin:0 auto 80px; padding:0 16px; }
      .wp-item { margin:28px 0; }
      .wp-item canvas { width:100%; height:auto; display:block; border-radius:16px;
        box-shadow:0 6px 28px rgba(13,15,18,.10); }
      .wp-bar { display:flex; justify-content:space-between; align-items:center; margin:10px 2px 0; }
      .wp-bar span { font-size:13px; color:#6B7280; }
      .wp-bar button { background:#0D0F12; color:#fff; border:0; border-radius:8px;
        padding:9px 20px; font-size:14px; font-weight:700; cursor:pointer; }
      .wp-bar button:hover { opacity:.85; }
    `;
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  }

  function injectFonts() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@600;700;800&display=swap';
    document.head.appendChild(link);
  }

  function addPoster(list, name, canvas) {
    const item = document.createElement('div');
    item.className = 'wp-item';
    item.appendChild(canvas);
    const bar = document.createElement('div');
    bar.className = 'wp-bar';
    const label = document.createElement('span');
    label.textContent = `${name} · ${canvas.width}×${canvas.height}`;
    const btn = document.createElement('button');
    btn.textContent = '下载 PNG';
    btn.onclick = () => {
      canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${name}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    };
    bar.appendChild(label);
    bar.appendChild(btn);
    item.appendChild(bar);
    list.appendChild(item);
  }

  async function renderAll(d) {
    injectFonts();
    injectStyles();

    const head = document.createElement('div');
    head.className = 'wp-head';
    head.innerHTML = `<h1>${d.pageTitle || '一人公司搞钱周报海报'} · ${d.date}</h1>
      <p>1 张合集 + ${d.news.length} 张单图 · 高度随内容自适应 · 二维码 → ${d.articleUrl.replace(/^https?:\/\//, '')}</p>`;
    document.body.appendChild(head);

    const list = document.createElement('div');
    list.className = 'wp-list';
    document.body.appendChild(list);

    try { await document.fonts.ready; } catch (e) { /* 字体加载失败用 fallback 字体继续画 */ }
    // Google Fonts 的 CJK 子集是懒加载的：先用真实文案触发一次，再等 ready
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;left:-9999px;font-family:"Noto Sans SC";font-weight:900';
    probe.textContent = '匠人学院搞钱周报' + (d.items || []).map((i) => i.title).join('');
    document.body.appendChild(probe);
    try { await document.fonts.ready; } catch (e) { /* 同上 */ }
    probe.remove();

    // 合集
    const mctx = document.createElement('canvas').getContext('2d');
    const sumCanvas = document.createElement('canvas');
    sumCanvas.width = W;
    sumCanvas.height = Math.ceil(measureSummary(mctx, d));
    drawSummary(sumCanvas, d);
    addPoster(list, `weekly-${d.date}-summary`, sumCanvas);

    // 单张
    d.news.forEach((n) => {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = Math.ceil(measureSingle(mctx, n));
      drawSingle(c, n, d);
      addPoster(list, `weekly-${d.date}-${n.slug}`, c);
    });
  }

  window.WeeklyPoster = { renderAll };
})();
