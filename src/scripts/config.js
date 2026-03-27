export const SYSTEM_PROMPT = `You are a mathematical blackboard controller.
Respond ONLY with one JSON object in this exact schema:
{
  "action": "write|erase",
  "title": "Concept name (max 5 words)",
  "equations": [
    { "label": "optional tag", "latex": "raw KaTeX expression", "size": "large|medium|small" }
  ],
  "notes": ["short chalk annotation", "..."]
}
Rules:
- If user intent is erase/wipe/clear board, return action="erase" and empty title/equations/notes.
- Prefer reusing previously written equations when useful, only change what is needed.
- Always include "label" for each equation (use empty string if none).
- latex must be valid KaTeX and must not use $ wrappers.
- No markdown fences. JSON only.`;

export const CHAT_MODEL = 'gpt-4o-mini';
export const TRANSCRIBE_MODEL = 'whisper-1';

export const RESPONSE_SCHEMA = {
  name: 'blackboard_response',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      action: { type: 'string', enum: ['write', 'erase'] },
      title: { type: 'string' },
      equations: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            label: { type: 'string' },
            latex: { type: 'string' },
            size: { type: 'string', enum: ['large', 'medium', 'small'] },
          },
          required: ['label', 'latex', 'size'],
        },
      },
      notes: { type: 'array', items: { type: 'string' } },
    },
    required: ['action', 'title', 'equations', 'notes'],
  },
  strict: true,
};
