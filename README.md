# AI-Blackboard

Interactive single-page chalkboard UI that can take **text, audio, or image input**, then ask an LLM to either:

- write equations + short notes, or
- erase the board when the user intent is to clear it.

## Run locally

1. Open `index.html` directly in your browser, or serve this folder with any static server.
2. Paste your OpenAI API key.
3. Provide input by typing, recording audio, and/or attaching an image.
4. Click **✎ Write**.

## Behavior

- The model returns structured JSON with an `action` field:
  - `write` → render equations and notes.
  - `erase` → clear the board.
- Audio is transcribed with `whisper-1` before sending to the blackboard model.

## Notes

- This demo calls OpenAI APIs directly from the browser.
- For production, use a backend proxy so API keys are never exposed client-side.
