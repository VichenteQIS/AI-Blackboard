import { CHAT_MODEL, SYSTEM_PROMPT } from './config.js';
import { boardState } from './state.js';

function safeParseModelJSON(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const jsonSlice = firstBrace >= 0 && lastBrace > firstBrace
    ? cleaned.slice(firstBrace, lastBrace + 1)
    : cleaned;
  return JSON.parse(jsonSlice);
}

export async function readImageAsDataURL(file) {
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}

export async function fetchBoard({ query, imageDataURL, key }) {
  const userParts = [];
  if (query) userParts.push({ type: 'text', text: query });
  if (imageDataURL) userParts.push({ type: 'image_url', image_url: { url: imageDataURL } });

  const contextText = boardState.equations.length
    ? `Current board equations:\n${boardState.equations.map((eq, i) => `${i + 1}) ${eq.label || 'eq'}: ${eq.latex || ''}`).join('\n')}`
    : 'Current board is empty.';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.2,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'assistant', content: contextText },
        { role: 'user', content: userParts.length ? userParts : [{ type: 'text', text: 'erase' }] },
      ],
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || res.statusText);
  }

  const payload = await res.json();
  const raw = payload.choices?.[0]?.message?.content || '{}';
  const parsed = safeParseModelJSON(raw);
  if (!parsed.action) parsed.action = 'write';
  return parsed;
}
