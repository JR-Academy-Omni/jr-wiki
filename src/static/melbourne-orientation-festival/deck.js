// 2026 S2 墨尔本新生节 · 真文字播放器
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const slides = $$('.slide');
const N = slides.length;
const counter = $('.count'), segEl = $('.seg'), barEl = $('.bar'), ovlist = $('.ovlist');
let i = 0;

function chrome() {
  counter.textContent = (i + 1) + ' / ' + N;
  segEl.textContent = slides[i].dataset.seg || '';
  barEl.style.width = ((i + 1) / N * 100) + '%';
  ovlist && $$('.ovlist button').forEach((b, n) => b.classList.toggle('cur', n === i));
  history.replaceState(null, '', '#' + (i + 1));
}
function go(n) {
  n = Math.max(0, Math.min(N - 1, n));
  if (n === i) { chrome(); return; }
  const dir = n > i ? 1 : -1, inc = slides[n];
  inc.classList.add(dir > 0 ? 'prep-next' : 'prep-prev');
  slides[i].classList.remove('active');
  void inc.offsetWidth;
  inc.classList.remove('prep-next', 'prep-prev');
  inc.classList.add('active');
  i = n; chrome();
}

// 板块总览
slides.forEach((s, n) => {
  const b = document.createElement('button');
  b.innerHTML = `<span class="pg">${n + 1}</span> ${s.dataset.seg || ''}`;
  b.addEventListener('click', () => { go(n); closeOv(); });
  ovlist.appendChild(b);
});
const ov = $('.grid-ov');
const openOv = () => ov.classList.add('open');
const closeOv = () => ov.classList.remove('open');

// 编辑开关
let editing = false;
function toggleEdit() {
  editing = !editing;
  document.body.classList.toggle('edit', editing);
  $('.edit-btn').classList.toggle('on', editing);
  $$('[data-edit]').forEach((el) => el.contentEditable = editing ? 'true' : 'false');
}

// 控件
$('.prev').addEventListener('click', (e) => { e.stopPropagation(); go(i - 1); });
$('.next').addEventListener('click', (e) => { e.stopPropagation(); go(i + 1); });
$('.grid-btn').addEventListener('click', (e) => { e.stopPropagation(); openOv(); });
$('.gclose').addEventListener('click', closeOv);
$('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); toggleEdit(); });
$('.fs-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});

// 点击翻页（编辑态/点到文字时不翻）
$('.deck').addEventListener('click', (e) => {
  if (editing || e.target.closest('.hud,.grid-ov,.top,[data-edit]')) return;
  go(e.clientX > window.innerWidth / 2 ? i + 1 : i - 1);
});
// 触屏滑动
let sx = null;
$('.deck').addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
$('.deck').addEventListener('touchend', (e) => {
  if (sx === null || editing) return;
  const dx = e.changedTouches[0].clientX - sx;
  if (Math.abs(dx) > 45) go(dx < 0 ? i + 1 : i - 1);
  sx = null;
});
// 键盘
document.addEventListener('keydown', (e) => {
  if (editing) { if (e.key === 'Escape') toggleEdit(); return; }
  if (ov.classList.contains('open')) { if (e.key === 'Escape') closeOv(); return; }
  switch (e.key) {
    case 'ArrowRight': case ' ': case 'PageDown': e.preventDefault(); go(i + 1); break;
    case 'ArrowLeft': case 'PageUp': e.preventDefault(); go(i - 1); break;
    case 'Home': go(0); break; case 'End': go(N - 1); break;
    case 'g': case 'G': openOv(); break;
    case 'e': case 'E': toggleEdit(); break;
    case 'f': case 'F':
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.(); break;
  }
});

// 待机自动隐藏
let idleT;
function activity() { document.body.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => { if (!editing) document.body.classList.add('idle'); }, 2800); }
['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach((ev) => document.addEventListener(ev, activity, { passive: true }));
activity();

// hash 恢复
const h = parseInt(location.hash.replace('#', ''), 10);
if (!isNaN(h) && h >= 1 && h <= N) i = h - 1;
slides.forEach((s, n) => s.classList.toggle('active', n === i));
chrome();
