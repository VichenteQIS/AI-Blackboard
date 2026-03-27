# AI-Blackboard

Interactive single-page chalkboard UI that renders AI-generated equations and notes in real time.

## Run locally

1. Open `index.html` directly in your browser, or serve this folder with any static server.
2. Paste your OpenAI API key in the left input.
3. Ask for an equation/concept and click **✎ Write**.

## Notes

- This demo calls `https://api.openai.com/v1/chat/completions` directly from the browser.
- For production, use a backend proxy so API keys are never exposed client-side.
