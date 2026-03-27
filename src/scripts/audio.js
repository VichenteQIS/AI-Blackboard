import { TRANSCRIBE_MODEL } from './config.js';
import { el } from './dom.js';
import { boardState } from './state.js';
import { setStatus } from './ui.js';

let mediaRecorder = null;
let recordedChunks = [];

export async function transcribeAudio(key) {
  if (!boardState.recordedAudioBlob) return '';

  const form = new FormData();
  form.append('file', boardState.recordedAudioBlob, 'prompt.webm');
  form.append('model', TRANSCRIBE_MODEL);

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key },
    body: form,
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || 'Audio transcription failed.');
  }
  const data = await res.json();
  return (data.text || '').trim();
}

export async function toggleRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    el.micBtn.textContent = '🎙 Record';
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus('Microphone recording is not supported in this browser.');
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  recordedChunks = [];
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = evt => {
    if (evt.data.size > 0) recordedChunks.push(evt.data);
  };

  mediaRecorder.onstop = () => {
    boardState.recordedAudioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
    el.voiceChip.textContent = 'Audio captured ✓';
    setStatus('Audio captured. Click ✎ Write.');
    stream.getTracks().forEach(track => track.stop());
  };

  mediaRecorder.start();
  el.micBtn.textContent = '■ Stop';
  setStatus('Recording… click ■ Stop when done.');
}
