# AI-Blackboard

Interactive single-page chalkboard UI with **text, voice, and image inputs**.

## Features

- Visible input rows for API key, text prompt, voice recording, and image upload.
- LLM action routing via structured JSON:
  - `write` → render/update equations and notes.
  - `erase` → clear the board.
- JSON output is constrained with a schema and parser fallback to reduce LaTeX escaping errors.
- Dynamic board resize: drag the bottom-right handle or use width/height sliders.
- Animated chalk effects for writing, moving/reusing, and erasing equations.

## Project structure

```text
index.html
src/
  styles/
    main.css
  scripts/
    app.js        # app bootstrap + event wiring
    api.js        # OpenAI calls + JSON parsing
    audio.js      # recording + transcription
    config.js     # model names + system prompt
    dom.js        # centralized DOM refs
    resizer.js    # drag + slider size controls
    state.js      # shared board/app state
    ui.js         # rendering + transitions
```

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
