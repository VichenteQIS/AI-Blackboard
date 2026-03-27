# AI-Blackboard

Interactive single-page chalkboard UI with **text, voice, and image inputs**.

## Features

- **Visible input rows** for API key, text prompt, voice recording, and image upload.
- **LLM action routing** via structured JSON:
  - `write` → render/update equations and notes.
  - `erase` → clear the board.
- **Dynamic board resize**: drag the bottom-right corner handle.
- **Animated chalk effects**:
  - New equations animate as if an invisible hand writes them.
  - Existing equations are reused and animated into new positions when possible.
  - Removed equations fade/erase out.
  - `write` → render equations/notes.
  - `erase` → clear the board.
- **Resizable board**: drag the bottom-right corner handle to dynamically resize.

## Run locally

1. Open `index.html` in your browser (or serve the folder with any static server).
2. Paste your OpenAI API key.
3. Provide one or more inputs:
   - Text prompt
   - Voice recording
   - Image upload
4. Click **✎ Write**.

## Notes

- Audio is transcribed with `whisper-1`.
- This demo calls OpenAI APIs directly from the browser.
- For production use, proxy API calls through a backend to protect API keys.
