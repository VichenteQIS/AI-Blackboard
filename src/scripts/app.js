import { el } from './dom.js';
import { boardState, resetBoardState } from './state.js';
import { paint, setStatus, showIdle, showLoading, animateEraseSweep } from './ui.js';
import { toggleRecording, transcribeAudio } from './audio.js';
import { fetchBoard, readImageAsDataURL } from './api.js';
import { setupResizer, setupSizeControls } from './resizer.js';

async function go() {
  const key = el.apikey.value.trim();
  const query = el.req.value.trim();
  const imageFile = el.image.files?.[0];

  if (!key) {
    setStatus('Paste your OpenAI API key first.');
    return;
  }

  let transcript = '';
  let imageDataURL = null;

  el.goBtn.disabled = true;
  showLoading();
  setStatus('');

  try {
    if (boardState.recordedAudioBlob) transcript = await transcribeAudio(key);
    if (imageFile) imageDataURL = await readImageAsDataURL(imageFile);

    const mergedQuery = [query, transcript].filter(Boolean).join('\n');
    if (!mergedQuery && !imageDataURL) {
      showIdle();
      setStatus('Provide at least one input: text, voice, or image.');
      return;
    }

    const nextBoard = await fetchBoard({ query: mergedQuery, imageDataURL, key });
    paint(nextBoard);

    boardState.recordedAudioBlob = null;
    el.voiceChip.textContent = 'No audio captured';
    el.image.value = '';
    el.imageChip.textContent = 'No image selected';
    el.req.value = '';
  } catch (err) {
    showIdle();
    setStatus(err.message || 'Something went wrong.');
    console.error(err);
  } finally {
    el.goBtn.disabled = false;
    el.req.focus();
  }
}

function clearBoard() {
  boardState.recordedAudioBlob = null;
  el.voiceChip.textContent = 'No audio captured';
  el.image.value = '';
  el.imageChip.textContent = 'No image selected';
  el.req.value = '';
  animateEraseSweep();
  setTimeout(showIdle, 220);
  resetBoardState();
  setStatus('');
}

function wireEvents() {
  el.goBtn.addEventListener('click', go);
  el.eraseBtn.addEventListener('click', clearBoard);
  el.micBtn.addEventListener('click', () => toggleRecording().catch(err => setStatus(err.message || 'Microphone error.')));
  el.image.addEventListener('change', e => {
    const name = e.target.files?.[0]?.name;
    el.imageChip.textContent = name ? `Selected: ${name}` : 'No image selected';
  });
  el.req.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}

wireEvents();
setupResizer();
setupSizeControls();
