# AI-Blackboard

Interactive chalkboard + chat experience with **text, voice, and image input**.

## What's new

- ChatGPT-style conversational area with user/assistant messages.
- **Conversational mode** (hands-free): click once to enable, then speak naturally.
- The app listens, detects when you stop talking, transcribes, updates the board, and replies in chat automatically.
- Infinite-style board behavior: drag/pan the green board and release; new equations are written at the new viewport center while previous equations stay where they were.

## Features

- LLM action routing via structured JSON:
  - `write` → render/update equations and notes.
  - `erase` → clear the board.
- Dynamic board resize: drag the bottom-right handle or use width/height sliders.
- Pannable board canvas with persistent equation placements.
- Animated chalk effects for writing, moving/reusing, and erasing equations.
- LaTeX normalization step to recover common escaped-command artifacts before KaTeX rendering.
- Optional synthesized chalk/eraser noise effects on write/erase interactions.
- Drawing tool, shape placement tool, and sticky-note placement on the infinite board.
- Settings modal for sound volume, equation color, draw color, and default shape type.
- Erase confirmation prompt before clearing all board artifacts.

## Project structure

```text
index.html
src/
  styles/main.css
  scripts/
    app.js        # app bootstrap + conversational flow
    api.js        # OpenAI calls + JSON parsing
    audio.js      # silence-detection recording + transcription
    config.js     # system prompt + schema + model constants
    dom.js        # centralized DOM refs
    resizer.js    # drag + slider size controls
    state.js      # shared board/app state
    ui.js         # board rendering + transitions
```

## Run locally

1. Open `index.html` in your browser (or serve the folder with any static server).
2. Paste your OpenAI API key.
3. Either:
   - Type a message and press **Send**, or
   - Turn on **Conversational mode** and just talk.

## Notes

- Audio is transcribed with `whisper-1`.
- This demo calls OpenAI APIs directly from the browser.
- For production use, proxy API calls through a backend to protect API keys.
