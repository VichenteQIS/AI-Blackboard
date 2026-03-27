import { el } from './dom.js';
import { boardState, makeEqKey, resetBoardState } from './state.js';

let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let basePanX = 0;
let basePanY = 0;

export function setStatus(msg) {
  el.status.textContent = msg ? `⚠ ${msg}` : '';
}

export function showLoading() {
  setStatus('Thinking…');
}

export function showIdle() {
  renderBoard();
}

function renderLatex(latex) {
  const normalized = normalizeLatex(latex);
  try {
    return katex.renderToString(normalized, { displayMode: true, throwOnError: false, strict: false });
  } catch {
    return `<span style="color:rgba(255,150,150,.8);font-size:14px">${normalized}</span>`;
  }
}

function normalizeLatex(input) {
  let s = String(input || '');

  // JSON escape side effects: \t, \f, \b can become control chars and break commands.
  s = s
    .replace(/\text\{/g, '\\text{')   // tab + ext{
    .replace(/\frac\{/g, '\\frac{')   // formfeed + rac{
    .replace(/\beta\b/g, '\\beta')    // backspace + eta
    .replace(/\rho\b/g, '\\rho');     // carriage-return + ho

  // Strip remaining control chars that would confuse KaTeX rendering.
  s = s.replace(/[\u0000-\u001f]/g, '');

  // Recover common commands when the leading slash was dropped.
  const cmds = ['text', 'frac', 'cos', 'sin', 'tan', 'theta', 'alpha', 'beta', 'gamma', 'pi', 'sqrt', 'left', 'right', 'cdot'];
  for (const cmd of cmds) {
    const re = new RegExp(`(^|[^\\\\])${cmd}(?=[\\s\\{\\(])`, 'g');
    s = s.replace(re, `$1\\\\${cmd}`);
  }

  return s;
}

function renderItem(item) {
  const wrapper = document.createElement('div');
  wrapper.className = 'board-item';
  wrapper.style.left = `${item.x + boardState.panX}px`;
  wrapper.style.top = `${item.y + boardState.panY}px`;
  wrapper.dataset.itemId = String(item.id);

  const title = document.createElement('div');
  title.className = 'eq-title';
  title.textContent = item.title || '';
  wrapper.appendChild(title);

  const strip = document.createElement('div');
  strip.className = 'eq-strip';

  (item.equations || []).forEach((eq, i) => {
    if (i > 0) {
      const divider = document.createElement('div');
      divider.className = 'eq-divider';
      strip.appendChild(divider);
    }

    const row = document.createElement('div');
    row.className = 'eq-row';
    row.dataset.key = makeEqKey(eq, i);

    if (eq.label) {
      const lbl = document.createElement('div');
      lbl.className = 'eq-label';
      lbl.textContent = eq.label;
      row.appendChild(lbl);
    }

    const math = document.createElement('div');
    math.className = `eq-math sz-${eq.size || 'large'}`;
    math.innerHTML = renderLatex(eq.latex || '');
    row.appendChild(math);

    strip.appendChild(row);
  });

  wrapper.appendChild(strip);

  const notesEl = document.createElement('div');
  notesEl.className = 'notes-area';
  (item.notes || []).forEach((n, i) => {
    const note = document.createElement('div');
    note.className = 'note';
    note.style.animationDelay = `${Math.min(i * 80, 280)}ms`;
    note.textContent = n;
    notesEl.appendChild(note);
  });

  wrapper.appendChild(notesEl);
  return wrapper;
}

export function renderBoard() {
  el.boardContent.innerHTML = '';

  if (!boardState.items.length) {
    const idleTitle = document.createElement('div');
    idleTitle.className = 'idle-title';
    idleTitle.textContent = 'What shall I write?';

    const idleHint = document.createElement('div');
    idleHint.className = 'idle-hint';
    idleHint.textContent = 'Drag to move the board. Release and I write there.';

    el.boardContent.appendChild(idleTitle);
    el.boardContent.appendChild(idleHint);
  }

  boardState.items.forEach(item => {
    el.boardContent.appendChild(renderItem(item));
  });

  const marker = document.createElement('div');
  marker.className = 'write-marker';
  marker.style.left = `${boardState.nextWriteX + boardState.panX}px`;
  marker.style.top = `${boardState.nextWriteY + boardState.panY}px`;
  marker.title = 'Next write position';
  el.boardContent.appendChild(marker);
}

export function animateEraseSweep() {
  const sweep = document.createElement('div');
  sweep.className = 'erase-sweep';
  el.boardContent.appendChild(sweep);
  setTimeout(() => sweep.remove(), 500);
}

export function paint(nextData) {
  if (nextData.action === 'erase') {
    animateEraseSweep();
    resetBoardState();
    setTimeout(renderBoard, 220);
    return;
  }

  const item = {
    id: boardState.nextId++,
    x: boardState.nextWriteX,
    y: boardState.nextWriteY,
    title: nextData.title || '',
    equations: (nextData.equations || []).slice(0, 4),
    notes: (nextData.notes || []).slice(0, 4),
  };

  boardState.items.push(item);
  renderBoard();
}

export function initBoardNavigation() {
  const updateNextWriteFromCenter = () => {
    const rect = el.board.getBoundingClientRect();
    boardState.nextWriteX = rect.width / 2 - boardState.panX;
    boardState.nextWriteY = rect.height / 2 - boardState.panY;
  };

  el.board.addEventListener('pointerdown', evt => {
    if (evt.button !== 0) return;
    isPanning = true;
    panStartX = evt.clientX;
    panStartY = evt.clientY;
    basePanX = boardState.panX;
    basePanY = boardState.panY;
    el.board.setPointerCapture(evt.pointerId);
  });

  el.board.addEventListener('pointermove', evt => {
    if (!isPanning) return;
    boardState.panX = basePanX + (evt.clientX - panStartX);
    boardState.panY = basePanY + (evt.clientY - panStartY);
    updateNextWriteFromCenter();
    renderBoard();
  });

  const finishPan = () => {
    if (!isPanning) return;
    isPanning = false;
    updateNextWriteFromCenter();
    renderBoard();
  };

  el.board.addEventListener('pointerup', finishPan);
  el.board.addEventListener('pointercancel', finishPan);

  updateNextWriteFromCenter();
  renderBoard();
}
