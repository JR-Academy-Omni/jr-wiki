// 共享翻页逻辑：每个 HTML 文件 = 一段可键盘翻页的子 deck
// ← → / 空格 / 点击切页；HUD 显示页码 + 跨文件上一段/下一段
(function () {
  const slides = Array.from(document.querySelectorAll('.slide'));
  if (!slides.length) return;
  let i = 0;

  // 从 URL hash 恢复（如 #3）
  const fromHash = parseInt(location.hash.replace('#', ''), 10);
  if (!isNaN(fromHash) && fromHash >= 1 && fromHash <= slides.length) i = fromHash - 1;

  const counter = document.querySelector('.count');
  const prevSec = document.querySelector('[data-prev-section]');
  const nextSec = document.querySelector('[data-next-section]');

  function render() {
    slides.forEach((s, n) => s.classList.toggle('active', n === i));
    if (counter) counter.textContent = (i + 1) + ' / ' + slides.length;
    history.replaceState(null, '', '#' + (i + 1));
  }
  function go(d) {
    const n = i + d;
    if (n < 0) { if (prevSec && prevSec.href) { location.href = prevSec.href; } return; }
    if (n >= slides.length) { if (nextSec && nextSec.href) { location.href = nextSec.href; } return; }
    i = n; render();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
    else if (e.key === 'Home') { i = 0; render(); }
    else if (e.key === 'End') { i = slides.length - 1; render(); }
    else if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    }
  });

  // 点击右/左半屏翻页
  document.querySelector('.deck')?.addEventListener('click', (e) => {
    if (e.target.closest('.hud') || e.target.closest('.secnav') || e.target.closest('a')) return;
    go(e.clientX > window.innerWidth / 2 ? 1 : -1);
  });

  document.querySelector('.hud .next')?.addEventListener('click', (e) => { e.stopPropagation(); go(1); });
  document.querySelector('.hud .prev')?.addEventListener('click', (e) => { e.stopPropagation(); go(-1); });

  render();
})();
