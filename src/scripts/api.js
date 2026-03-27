import { CHAT_MODEL, RESPONSE_SCHEMA, SYSTEM_PROMPT } from './config.js';
import { boardState } from './state.js';

function sliceJSONObject(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  return firstBrace >= 0 && lastBrace > firstBrace
    ? cleaned.slice(firstBrace, lastBrace + 1)
    : cleaned;
}

function escapeInvalidBackslashes(jsonText) {
  // Convert lone backslashes in strings (often from LaTeX) into escaped backslashes.
  return jsonText.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
}

function safeParseModelJSON(raw) {
  const jsonSlice = sliceJSONObject(raw);

  try {
    return JSON.parse(jsonSlice);
  } catch (firstError) {
    try {
      return JSON.parse(escapeInvalidBackslashes(jsonSlice));
    } catch {
      throw firstError;
    }
  }
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
  if (imageDataURL) userParts.push({ type: 'image_url', image_url: { url: imageDataURL } });

  const recent = boardState.items.slice(-4);
  const contextText = recent.length
    ? `Current board snippets:\n${recent.map((item, idx) => {
      const eqs = (item.equations || []).map((eq, i) => `${i + 1}) ${eq.label || 'eq'}: ${eq.latex || ''}`).join(' | ');
      return `${idx + 1}. ${item.title || 'Untitled'} @ (${Math.round(item.x)}, ${Math.round(item.y)}): ${eqs}`;
    }).join('\n')}`
    : 'Current board is empty.';
  const instructionText = `Board context:\n${contextText}\n\nUser request:\n${query || 'erase'}\n\nIf the user is iterating, update existing equations rather than replacing unrelated content.`;
  userParts.unshift({ type: 'text', text: instructionText });

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
      response_format: {
        type: 'json_schema',
        json_schema: RESPONSE_SCHEMA,
      },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userParts },
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
