# AIMLAPI setup

This project uses AIMLAPI server-side. The browser never receives the AIMLAPI key.

## Environment variable

Set this server-side environment variable in your hosting provider:

`AIMLAPI_KEY=...`

Do not use `VITE_AIMLAPI_KEY` or put the key in React/client code.

## Netlify

In the Netlify site dashboard, open:
Site configuration → Environment variables → Add a variable

Name: `AIMLAPI_KEY`
Value: your AIMLAPI secret key
Scopes: include the production/deploy context you use

Then trigger a new deploy.

## Provider mapping

- AI 1 — Claude → `anthropic/claude-sonnet-5.5`
- AI 2 — ChatGPT → `openai/gpt-5-chat-latest`
- AI 3 — Gemini → `google/gemini-3.5-flash-lite`
- Auto → `openai/gpt-5.5`

Offline AI remains available through WebLLM when downloaded and supported by the device/browser.
