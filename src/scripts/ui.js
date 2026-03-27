import { el } from './dom.js';
import { boardState, makeEqKey, resetBoardState } from './state.js';

let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let basePanX = 0;
let basePanY = 0;
let audioCtx = null;
let drawCurrentPath = null;

export function setStatus(msg) {
  el.status.textContent = msg ? `⚠ ${msg}` : '';
}

export function setToolMode(mode) {
  boardState.tools.mode = mode;
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
    return katex.renderToString(normalized, { displayMode: true, throwOnError: true, strict: false });
  } catch {
    const repaired = aggressiveNormalizeLatex(normalized);
    try {
      return katex.renderToString(repaired, { displayMode: true, throwOnError: false, strict: false });
    } catch {
      return `<span style="color:rgba(255,150,150,.8);font-size:14px">${repaired}</span>`;
    }
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

  // Repair common truncated command heads after control-char stripping.
  s = s
    .replace(/(^|[^\\])ext\{/g, '$1\\\\text{')
    .replace(/(^|[^\\])rac\{/g, '$1\\\\frac{')
    .replace(/(^|[^\\])heta\b/g, '$1\\\\theta')
    .replace(/(^|[^\\])psi\b/g, '$1\\\\psi')
    .replace(/(^|[^\\])alpha\b/g, '$1\\\\alpha')
    .replace(/(^|[^\\])beta\b/g, '$1\\\\beta');

  // Recover common commands when the leading slash was dropped.
  const cmds = ['text', 'frac', 'cos', 'sin', 'tan', 'theta', 'alpha', 'beta', 'gamma', 'pi', 'sqrt', 'left', 'right', 'cdot'];
  for (const cmd of cmds) {
    const re = new RegExp(`(^|[^\\\\])${cmd}(?=[\\s\\{\\(])`, 'g');
    s = s.replace(re, `$1\\\\${cmd}`);
  }

  // Reduce odd spacing artifacts around operators.
  s = s.replace(/\s{2,}/g, ' ').replace(/\s*([=+\-])\s*/g, ' $1 ').trim();

  return s;
}

function aggressiveNormalizeLatex(s) {
  return String(s || '')
    .replace(/\\f\b/g, '\\frac')
    .replace(/\\h\b/g, '\\hbar')
    .replace(/\\n\b/g, '\\nabla')
    .replace(/\\p\b/g, '\\partial')
    .replace(/\\t\b/g, '\\theta')
    .replace(/(^|[^\\])frac(?=\{)/g, '$1\\\\frac')
    .replace(/(^|[^\\])hbar\b/g, '$1\\\\hbar')
    .replace(/(^|[^\\])partial\b/g, '$1\\\\partial')
    .replace(/(^|[^\\])nabla\b/g, '$1\\\\nabla');
}

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

export function playChalkNoise(duration = 0.18) {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.2;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1300;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.08 * boardState.settings.volume), now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(hp).connect(gain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  } catch {
    // no-op on browsers blocking autoplay audio
  }
}

export function playEraserNoise(duration = 0.28) {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.24;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 500;
    bp.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.1 * boardState.settings.volume), now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(bp).connect(gain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  } catch {
    // no-op
  }
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

function renderShapesAndNotes() {
  // Shapes
  boardState.shapes.forEach(shape => {
    const node = document.createElement('div');
    node.className = 'user-shape';
    node.style.left = `${shape.x + boardState.panX}px`;
    node.style.top = `${shape.y + boardState.panY}px`;
    node.style.width = `${shape.w}px`;
    node.style.height = `${shape.h}px`;
    node.style.border = `2px solid ${shape.color}`;

    if (shape.type === 'circle') node.style.borderRadius = '50%';
    else if (shape.type === 'triangle') {
      node.style.width = '0';
      node.style.height = '0';
      node.style.borderLeft = `${shape.w / 2}px solid transparent`;
      node.style.borderRight = `${shape.w / 2}px solid transparent`;
      node.style.borderBottom = `${shape.h}px solid ${shape.color}`;
      node.style.borderTop = '0';
      node.style.borderRadius = '0';
    } else if (shape.type === 'line') {
      node.style.height = '2px';
      node.style.background = shape.color;
      node.style.border = 'none';
    }

    el.boardContent.appendChild(node);
  });

  // Sticky notes
  boardState.stickyNotes.forEach(note => {
    const n = document.createElement('div');
    n.className = 'sticky-note';
    n.style.left = `${note.x + boardState.panX}px`;
    n.style.top = `${note.y + boardState.panY}px`;
    n.textContent = note.text;
    n.dataset.noteId = String(note.id);
    makeStickyDraggable(n, note);
    el.boardContent.appendChild(n);
  });
}

function renderDrawLayer() {
  const w = el.board.clientWidth;
  const h = el.board.clientHeight;
  el.drawLayer.setAttribute('viewBox', `0 0 ${w} ${h}`);
  el.drawLayer.setAttribute('width', String(w));
  el.drawLayer.setAttribute('height', String(h));
  el.drawLayer.innerHTML = '';

  for (const path of boardState.drawPaths) {
    if (!path.points.length) continue;
    const pts = path.points
      .map(p => `${(p.x + boardState.panX).toFixed(1)},${(p.y + boardState.panY).toFixed(1)}`)
      .join(' ');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', path.color);
    poly.setAttribute('stroke-width', '2.4');
    poly.setAttribute('stroke-linecap', 'round');
    poly.setAttribute('stroke-linejoin', 'round');
    el.drawLayer.appendChild(poly);
  }
}

function makeStickyDraggable(node, note) {
  node.addEventListener('pointerdown', evt => {
    if (boardState.tools.mode !== 'pan') return;
    evt.stopPropagation();
    const startX = evt.clientX;
    const startY = evt.clientY;
    const baseX = note.x;
    const baseY = note.y;
    node.setPointerCapture(evt.pointerId);

    const move = moveEvt => {
      note.x = baseX + (moveEvt.clientX - startX);
      note.y = baseY + (moveEvt.clientY - startY);
      renderBoard();
    };

    const up = () => {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', up);
    };

    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
  });
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
  renderShapesAndNotes();

  const marker = document.createElement('div');
  marker.className = 'write-marker';
  marker.style.left = `${boardState.nextWriteX + boardState.panX}px`;
  marker.style.top = `${boardState.nextWriteY + boardState.panY}px`;
  marker.title = 'Next write position';
  el.boardContent.appendChild(marker);
  renderDrawLayer();
}

export function animateEraseSweep() {
  playEraserNoise();
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
  playChalkNoise();
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
    const rect = el.board.getBoundingClientRect();
    const worldX = evt.clientX - rect.left - boardState.panX;
    const worldY = evt.clientY - rect.top - boardState.panY;

    if (boardState.tools.mode === 'shape') {
      boardState.shapes.push({
        id: Date.now() + Math.random(),
        type: boardState.tools.shapeType,
        x: worldX,
        y: worldY,
        w: 90,
        h: 70,
        color: boardState.settings.drawColor,
      });
      playChalkNoise(0.12);
      renderBoard();
      return;
    }

    if (boardState.tools.mode === 'sticky') {
      const text = prompt('Sticky note text:', 'Remember this') || 'Note';
      boardState.stickyNotes.push({ id: Date.now() + Math.random(), x: worldX, y: worldY, text });
      playChalkNoise(0.08);
      renderBoard();
      return;
    }

    if (boardState.tools.mode === 'draw') {
      drawCurrentPath = {
        id: Date.now() + Math.random(),
        color: boardState.settings.drawColor,
        points: [{ x: worldX, y: worldY }],
      };
      boardState.drawPaths.push(drawCurrentPath);
      renderBoard();
      return;
    }

    isPanning = true;
    panStartX = evt.clientX;
    panStartY = evt.clientY;
    basePanX = boardState.panX;
    basePanY = boardState.panY;
    el.board.setPointerCapture(evt.pointerId);
  });

  el.board.addEventListener('pointermove', evt => {
    if (drawCurrentPath && boardState.tools.mode === 'draw') {
      const rect = el.board.getBoundingClientRect();
      const worldX = evt.clientX - rect.left - boardState.panX;
      const worldY = evt.clientY - rect.top - boardState.panY;
      drawCurrentPath.points.push({ x: worldX, y: worldY });
      renderDrawLayer();
      return;
    }
    if (!isPanning) return;
    boardState.panX = basePanX + (evt.clientX - panStartX);
    boardState.panY = basePanY + (evt.clientY - panStartY);
    updateNextWriteFromCenter();
    renderBoard();
  });

  const finishPan = () => {
    if (drawCurrentPath) {
      drawCurrentPath = null;
      playChalkNoise(0.1);
      renderDrawLayer();
      return;
    }
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
