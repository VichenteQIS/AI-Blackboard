import { TRANSCRIBE_MODEL } from './config.js';
import { boardState } from './state.js';

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

export async function captureVoiceUntilSilence({ silenceMs = 1300, threshold = 0.015 } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const chunks = [];

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);

  let speakingDetected = false;
  let silenceSince = null;

  mediaRecorder.ondataavailable = evt => {
    if (evt.data.size > 0) chunks.push(evt.data);
  };

  return await new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) {
        const n = (v - 128) / 128;
        sum += n * n;
      }
      const rms = Math.sqrt(sum / data.length);

      if (rms > threshold) {
        speakingDetected = true;
        silenceSince = null;
      } else if (speakingDetected) {
        silenceSince = silenceSince || Date.now();
        if (Date.now() - silenceSince >= silenceMs && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }
    }, 120);

    mediaRecorder.onstop = async () => {
      clearInterval(interval);
      source.disconnect();
      analyser.disconnect();
      await audioContext.close();
      stream.getTracks().forEach(track => track.stop());

      boardState.recordedAudioBlob = new Blob(chunks, { type: 'audio/webm' });
      resolve(boardState.recordedAudioBlob);
    };

    mediaRecorder.onerror = err => {
      clearInterval(interval);
      reject(err.error || new Error('MediaRecorder failed.'));
    };

    try {
      mediaRecorder.start();
    } catch (err) {
      clearInterval(interval);
      reject(err);
    }
  });
}
