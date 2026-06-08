// 2026 S2 墨尔本新生节 · 单页播放器
// 38 页真图清单 + 板块标签
const SLIDES = [
  { p:'01', seg:'封面' },
  { p:'02', seg:'活动概览' }, { p:'03', seg:'活动介绍' }, { p:'04', seg:'活动目的' },
  { p:'05', seg:'吸引新生' }, { p:'06', seg:'商家机会' },
  { p:'07', seg:'为什么选' }, { p:'08', seg:'场地介绍' }, { p:'09', seg:'Floor Plan' },
  { p:'10', seg:'合作套餐' }, { p:'11', seg:'价格对比' },
  { p:'12', seg:'往期回顾' }, { p:'13', seg:'活动概述' }, { p:'14', seg:'活动数据' },
  { p:'15', seg:'活动数据' }, { p:'16', seg:'赞助商' },
  { p:'17', seg:'活动亮点' }, { p:'18', seg:'反馈·参与者' }, { p:'19', seg:'反馈·参展商' },
  { p:'20', seg:'反馈·志愿者' }, { p:'21', seg:'活动照片' }, { p:'22', seg:'活动照片' },
  { p:'23', seg:'活动照片' }, { p:'24', seg:'活动照片' },
  { p:'25', seg:'关于课代表' }, { p:'26', seg:'课代表·小红书' }, { p:'27', seg:'课代表·小红书' },
  { p:'28', seg:'账号矩阵' }, { p:'29', seg:'课代表·公众号' }, { p:'30', seg:'课代表·公众号' },
  { p:'31', seg:'公众号矩阵' }, { p:'32', seg:'课代表·社群' },
  { p:'33', seg:'合作机会' }, { p:'34', seg:'成果展示' }, { p:'35', seg:'大学合作' },
  { p:'36', seg:'品牌活动' }, { p:'37', seg:'企业合作' }, { p:'38', seg:'联络我们' },
];

const $ = (s) => document.querySelector(s);
const frame = $('.frame'), thumbs = $('.thumbs'), gridEl = $('.grid');
const counter = $('.count'), segEl = $('.seg'), barEl = $('.bar');
let i = 0;

// 构建幻灯
const nodes = SLIDES.map((s, n) => {
  const el = document.createElement('div');
  el.className = 'slide' + (n === 0 ? ' active' : '');
  el.innerHTML = `<img src="assets/p${s.p}.jpg" alt="第${n + 1}页 · ${s.seg}" ${n > 1 ? 'loading="lazy"' : ''}>`;
  frame.appendChild(el);
  return el;
});

// 构建缩略图
SLIDES.forEach((s, n) => {
  const fig = document.createElement('figure');
  fig.innerHTML = `<img src="assets/p${s.p}.jpg" alt=""><figcaption>${n + 1} · ${s.seg}</figcaption>`;
  fig.addEventListener('click', () => { go(n); closeGrid(); });
  thumbs.appendChild(fig);
});

function render() {
  nodes.forEach((el, n) => el.classList.toggle('active', n === i));
  counter.textContent = (i + 1) + ' / ' + SLIDES.length;
  segEl.textContent = SLIDES[i].seg;
  barEl.style.width = ((i + 1) / SLIDES.length * 100) + '%';
  history.replaceState(null, '', '#' + (i + 1));
}
function go(n) { i = Math.max(0, Math.min(SLIDES.length - 1, n)); render(); }
function openGrid() { gridEl.classList.add('open'); }
function closeGrid() { gridEl.classList.remove('open'); }

// 控件
$('.prev').addEventListener('click', () => go(i - 1));
$('.next').addEventListener('click', () => go(i + 1));
$('.grid-btn').addEventListener('click', openGrid);
$('.gclose').addEventListener('click', closeGrid);
$('.fs-btn').addEventListener('click', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});

// 点击左右半屏翻页
$('.deck').addEventListener('click', (e) => {
  if (e.target.closest('.hud') || e.target.closest('.grid')) return;
  go(e.clientX > window.innerWidth / 2 ? i + 1 : i - 1);
});

document.addEventListener('keydown', (e) => {
  if (gridEl.classList.contains('open') && e.key === 'Escape') return closeGrid();
  switch (e.key) {
    case 'ArrowRight': case ' ': case 'PageDown': e.preventDefault(); go(i + 1); break;
    case 'ArrowLeft': case 'PageUp': e.preventDefault(); go(i - 1); break;
    case 'Home': go(0); break;
    case 'End': go(SLIDES.length - 1); break;
    case 'g': case 'G': gridEl.classList.contains('open') ? closeGrid() : openGrid(); break;
    case 'f': case 'F':
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.(); break;
  }
});

// 从 hash 恢复
const h = parseInt(location.hash.replace('#', ''), 10);
if (!isNaN(h) && h >= 1 && h <= SLIDES.length) i = h - 1;

// 预加载首图后隐藏 loader
const first = new Image();
first.onload = () => { render(); $('.loader')?.classList.add('gone'); };
first.onerror = () => { render(); $('.loader')?.classList.add('gone'); };
first.src = `assets/p${SLIDES[i].p}.jpg`;
render();
