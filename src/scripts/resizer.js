import { el } from './dom.js';

export function setupResizer() {
  let startX = 0, startY = 0, startW = 0, startH = 0;

  el.resizeHandle.addEventListener('pointerdown', e => {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    const rect = el.frame.getBoundingClientRect();
    startW = rect.width;
    startH = rect.height;

    const onMove = evt => {
      const nextW = Math.max(520, Math.min(window.innerWidth - 20, startW + (evt.clientX - startX)));
      const nextH = Math.max(460, Math.min(window.innerHeight - 20, startH + (evt.clientY - startY)));
      el.frame.style.width = `${nextW}px`;
      el.frame.style.height = `${nextH}px`;
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });
}

export function setupSizeControls() {
  function clampRangesToViewport() {
    el.wRange.max = String(Math.max(520, Math.min(1400, window.innerWidth - 20)));
    el.hRange.max = String(Math.max(460, Math.min(1100, window.innerHeight - 20)));
  }

  function syncFromFrame() {
    const rect = el.frame.getBoundingClientRect();
    el.wRange.value = String(Math.round(rect.width));
    el.hRange.value = String(Math.round(rect.height));
    el.wVal.textContent = `${Math.round(rect.width)}px`;
    el.hVal.textContent = `${Math.round(rect.height)}px`;
  }

  function applyRangeSize() {
    el.frame.style.width = `${el.wRange.value}px`;
    el.frame.style.height = `${el.hRange.value}px`;
    syncFromFrame();
  }

  clampRangesToViewport();
  syncFromFrame();

  el.wRange.addEventListener('input', applyRangeSize);
  el.hRange.addEventListener('input', applyRangeSize);

  window.addEventListener('resize', () => {
    clampRangesToViewport();
    syncFromFrame();
  });

  el.sizeReset.addEventListener('click', () => {
    el.frame.style.width = 'min(96vw,980px)';
    el.frame.style.height = 'min(90vh,680px)';
    requestAnimationFrame(syncFromFrame);
  });

  const observer = new ResizeObserver(syncFromFrame);
  observer.observe(el.frame);
}
