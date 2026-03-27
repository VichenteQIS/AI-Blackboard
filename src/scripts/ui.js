import { el } from './dom.js';
import { boardState, makeEqKey, resetBoardState } from './state.js';

export function setStatus(msg) {
  el.status.textContent = msg ? `⚠ ${msg}` : '';
}

export function showLoading() {
  el.boardContent.innerHTML = '<div class="loading"><span></span><span></span><span></span></div>';
}

export function showIdle() {
  el.boardContent.innerHTML = '<div class="idle-title">What shall I write?</div><div class="idle-hint">Use text, voice, or image. Say "erase" to clear the board.</div>';
}

function renderLatex(latex) {
  try {
    return katex.renderToString(latex, { displayMode: true, throwOnError: false, strict: false });
  } catch {
    return `<span style="color:rgba(255,150,150,.8);font-size:14px">${latex}</span>`;
  }
}

function buildEquationColumn(eq, i, key, isNew) {
  const col = document.createElement('div');
  col.className = `eq-row ${isNew ? 'new' : 'reused'}`;
  col.dataset.key = key;

  if (eq.label) {
    const lbl = document.createElement('div');
    lbl.className = 'eq-label';
    lbl.textContent = eq.label;
    col.appendChild(lbl);
  }

  const math = document.createElement('div');
  math.className = `eq-math sz-${eq.size || 'large'}`;
  math.innerHTML = renderLatex(eq.latex || '');
  col.appendChild(math);

  if (isNew) {
    const hand = document.createElement('div');
    hand.className = 'hand';
    col.appendChild(hand);
  }

  return col;
}

function capturePositions(root) {
  const map = new Map();
  root.querySelectorAll('.eq-row[data-key]').forEach(node => {
    map.set(node.dataset.key, node.getBoundingClientRect());
  });
  return map;
}

function spawnGhost(rect, sourceEl) {
  const boardRect = el.boardContent.getBoundingClientRect();
  const ghost = sourceEl.cloneNode(true);
  ghost.classList.remove('new', 'reused');
  ghost.classList.add('ghost-eq');
  ghost.style.left = `${rect.left - boardRect.left}px`;
  ghost.style.top = `${rect.top - boardRect.top}px`;
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  el.boardContent.appendChild(ghost);
  setTimeout(() => ghost.remove(), 550);
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
    setTimeout(showIdle, 220);
    resetBoardState();
    return;
  }

  const prevRows = Array.from(el.boardContent.querySelectorAll('.eq-row[data-key]'));
  const prevByKey = new Map(prevRows.map(node => [node.dataset.key, node]));
  const prevPositions = capturePositions(el.boardContent);

  const title = nextData.title || '';
  const equations = (nextData.equations || []).slice(0, 4);
  const notes = (nextData.notes || []).slice(0, 4);

  const strip = document.createElement('div');
  strip.className = 'eq-strip';

  equations.forEach((eq, i) => {
    const key = makeEqKey(eq, i);
    const reused = prevByKey.has(key);
    if (i > 0) {
      const divider = document.createElement('div');
      divider.className = 'eq-divider';
      strip.appendChild(divider);
    }
    strip.appendChild(buildEquationColumn(eq, i, key, !reused));
  });

  const notesEl = document.createElement('div');
  notesEl.className = 'notes-area';
  notes.forEach((n, i) => {
    const note = document.createElement('div');
    note.className = 'note';
    note.style.animationDelay = `${Math.min(i * 80, 280)}ms`;
    note.textContent = n;
    notesEl.appendChild(note);
  });

  el.boardContent.innerHTML = '';
  const titleEl = document.createElement('div');
  titleEl.className = 'eq-title';
  titleEl.textContent = title;
  el.boardContent.appendChild(titleEl);
  el.boardContent.appendChild(strip);
  el.boardContent.appendChild(notesEl);

  const nextRows = Array.from(el.boardContent.querySelectorAll('.eq-row[data-key]'));
  nextRows.forEach(row => {
    const from = prevPositions.get(row.dataset.key);
    if (!from) return;
    const to = row.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      row.style.transform = `translate(${dx}px, ${dy}px)`;
      row.style.opacity = '0.9';
      row.getBoundingClientRect();
      row.style.transform = 'translate(0, 0)';
      row.style.opacity = '1';
    }
  });

  prevByKey.forEach((node, key) => {
    if (!nextRows.find(r => r.dataset.key === key)) {
      const rect = prevPositions.get(key);
      if (rect) spawnGhost(rect, node);
    }
  });

  boardState.title = title;
  boardState.equations = equations;
  boardState.notes = notes;
}
