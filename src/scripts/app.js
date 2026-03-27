import { el } from './dom.js';
import { boardState, resetBoardState } from './state.js';
import { paint, setStatus, showIdle, showLoading, animateEraseSweep, initBoardNavigation, setToolMode } from './ui.js';
import { transcribeAudio, captureVoiceUntilSilence } from './audio.js';
import { fetchBoard, readImageAsDataURL } from './api.js';
import { setupResizer, setupSizeControls } from './resizer.js';

let autoConversationEnabled = false;
let autoConversationBusy = false;

function addChatMessage(role, text) {
  const msg = document.createElement('div');
  msg.className = `chat-msg ${role}`;
  msg.textContent = text;
  el.chatLog.appendChild(msg);
  el.chatLog.scrollTop = el.chatLog.scrollHeight;
}

function describeBoardChange(data) {
  if (data.action === 'erase') return 'I cleared the board.';
  const eqs = (data.equations || []).map((eq, i) => `${i + 1}) ${eq.latex}`).join('\n');
  const notes = (data.notes || []).length ? `\nNotes: ${(data.notes || []).join(' · ')}` : '';
  return `I wrote: ${data.title || 'Untitled'}\n${eqs}${notes}`;
}

async function go({ prefilledQuery = '' } = {}) {
  const key = el.apikey.value.trim();
  const query = (prefilledQuery || el.req.value).trim();
  const imageFile = el.image.files?.[0];

  if (!key) {
    setStatus('Paste your OpenAI API key first.');
    return;
  }

  let imageDataURL = null;
  el.goBtn.disabled = true;
  showLoading();
  setStatus('');

  try {
    if (imageFile) imageDataURL = await readImageAsDataURL(imageFile);

    if (!query && !imageDataURL) {
      showIdle();
      setStatus('Provide text, image, or voice in conversational mode.');
      return;
    }

    if (query) addChatMessage('user', query);

    const nextBoard = await fetchBoard({ query, imageDataURL, key });
    paint(nextBoard);
    addChatMessage('assistant', describeBoardChange(nextBoard));

    boardState.recordedAudioBlob = null;
    el.voiceChip.textContent = autoConversationEnabled ? 'Listening…' : 'Idle';
    el.image.value = '';
    el.imageChip.textContent = 'No image selected';
    el.req.value = '';
  } catch (err) {
    showIdle();
    setStatus(err.message || 'Something went wrong.');
    addChatMessage('assistant', `Error: ${err.message || 'Something went wrong.'}`);
    console.error(err);
  } finally {
    el.goBtn.disabled = false;
    el.req.focus();
  }
}

function clearBoard() {
  if (!confirm('Erase entire board (equations, drawings, shapes, sticky notes)?')) return;
  boardState.recordedAudioBlob = null;
  el.voiceChip.textContent = autoConversationEnabled ? 'Listening…' : 'Idle';
  el.image.value = '';
  el.imageChip.textContent = 'No image selected';
  el.req.value = '';
  animateEraseSweep();
  setTimeout(showIdle, 220);
  resetBoardState();
  addChatMessage('assistant', 'Board erased.');
  setStatus('');
}

async function runAutoConversationCycle() {
  if (!autoConversationEnabled || autoConversationBusy) return;

  const key = el.apikey.value.trim();
  if (!key) {
    setStatus('Add your API key before enabling conversational mode.');
    autoConversationEnabled = false;
    el.autoTalkBtn.classList.remove('active');
    el.autoTalkBtn.textContent = '🎧 Conversational mode: Off';
    el.voiceChip.textContent = 'Idle';
    return;
  }

  autoConversationBusy = true;
  el.voiceChip.textContent = 'Listening…';

  try {
    await captureVoiceUntilSilence();
    el.voiceChip.textContent = 'Transcribing…';
    const transcript = await transcribeAudio(key);

    if (transcript) {
      await go({ prefilledQuery: transcript });
    } else {
      addChatMessage('assistant', 'I did not catch that. Try again.');
    }
  } catch (err) {
    setStatus(err.message || 'Conversational mode failed.');
    addChatMessage('assistant', `Voice error: ${err.message || 'Unknown error.'}`);
  } finally {
    autoConversationBusy = false;
    if (autoConversationEnabled) {
      setTimeout(() => runAutoConversationCycle(), 250);
    } else {
      el.voiceChip.textContent = 'Idle';
    }
  }
}

function toggleAutoConversation() {
  autoConversationEnabled = !autoConversationEnabled;
  el.autoTalkBtn.classList.toggle('active', autoConversationEnabled);
  el.autoTalkBtn.textContent = autoConversationEnabled
    ? '🎧 Conversational mode: On'
    : '🎧 Conversational mode: Off';

  if (autoConversationEnabled) {
    addChatMessage('assistant', 'Conversational mode enabled. Start speaking; I will respond when you pause.');
    runAutoConversationCycle();
  } else {
    addChatMessage('assistant', 'Conversational mode stopped.');
    el.voiceChip.textContent = 'Idle';
  }
}

function wireEvents() {
  el.goBtn.addEventListener('click', () => go());
  el.eraseBtn.addEventListener('click', clearBoard);
  el.drawBtn.addEventListener('click', () => setMode('draw'));
  el.shapeBtn.addEventListener('click', () => setMode('shape'));
  el.stickyBtn.addEventListener('click', () => setMode('sticky'));
  el.settingsBtn.addEventListener('click', () => el.settingsModal.classList.remove('hidden'));
  el.settingsClose.addEventListener('click', () => el.settingsModal.classList.add('hidden'));
  el.settingsModal.addEventListener('click', evt => {
    if (evt.target === el.settingsModal) el.settingsModal.classList.add('hidden');
  });
  el.autoTalkBtn.addEventListener('click', toggleAutoConversation);
  el.image.addEventListener('change', e => {
    const name = e.target.files?.[0]?.name;
    el.imageChip.textContent = name ? `Selected: ${name}` : 'No image selected';
  });
  el.req.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });

  el.volumeRange.value = String(boardState.settings.volume);
  el.equationColor.value = boardState.settings.equationColor;
  el.drawColor.value = boardState.settings.drawColor;
  el.shapeSelect.value = boardState.tools.shapeType;

  el.volumeRange.addEventListener('input', () => {
    boardState.settings.volume = Number(el.volumeRange.value);
  });
  el.equationColor.addEventListener('input', () => {
    boardState.settings.equationColor = el.equationColor.value;
    document.documentElement.style.setProperty('--eq-color', boardState.settings.equationColor);
  });
  el.drawColor.addEventListener('input', () => {
    boardState.settings.drawColor = el.drawColor.value;
    document.documentElement.style.setProperty('--draw-color', boardState.settings.drawColor);
  });
  el.shapeSelect.addEventListener('change', () => {
    boardState.tools.shapeType = el.shapeSelect.value;
  });
}

function setMode(mode) {
  boardState.tools.mode = mode;
  setToolMode(mode);
  el.drawBtn.classList.toggle('active', mode === 'draw');
  el.shapeBtn.classList.toggle('active', mode === 'shape');
  el.stickyBtn.classList.toggle('active', mode === 'sticky');
  if (mode === 'shape') setStatus('Shape mode: click board to place shape.');
  else if (mode === 'sticky') setStatus('Sticky mode: click board to place note.');
  else if (mode === 'draw') setStatus('Draw mode: drag on board to draw.');
  else setStatus('');
}

wireEvents();
setupResizer();
setupSizeControls();
initBoardNavigation();
setMode('pan');
addChatMessage('assistant', 'Hi! You can type, attach an image, or enable conversational mode and just talk.');
