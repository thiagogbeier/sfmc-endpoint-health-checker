# Copilot Instructions — Vibe Coding Starter

> Purpose: Speed-run a tiny **web MVP** in under an hour. Keep scope minimal. Prefer plain React + Vite. Only add deps if necessary.

## Repo Context
- React + Vite single-page scaffold
- Objective: one clear user action (e.g., answer 5 questions, click-to-start mini-game, submit an email, display a simple chart)
- Keep code small and readable. Avoid premature abstractions.

## Guardrails
- No heavy frameworks unless explicitly requested.
- Minimize dependencies. If adding a lib, explain why in comments.
- Prefer native fetch and simple state via `useState`.
- Keep components flat. One file is fine until MVP works.

## Build Flow (ask the user step-by-step)
1. **Confirm the MVP goal** in one sentence.
2. **Sketch the UI** as simple JSX (form, button, list, results area).
3. **Wire the core interaction** (event handlers, state).
4. **Add one finishing touch** (basic validation, simple animation, or a tiny data mock).
5. **Ship** (build & preview), then suggest next steps.

## Prompts to Use with Me (copy/paste)
- "Given this idea: <idea>, propose a *one-hour MVP* with 3–5 steps and exactly one core user action."
- "Generate the minimal JSX + state to implement that action. No extra files unless needed."
- "Refactor my App.jsx to make the code clearer, without adding libraries."
- "Create a tiny fake data source (an array or JSON) and show how to render it and filter it."
- "Add a simple result screen summarizing what the user did, without routing."
- "Suggest the smallest possible accessibility improvements for this UI."
- "Write a 3–5 bullet README snippet telling someone how to run and use this MVP."

## Quality Bar
- Works locally with `npm run dev` and builds with `npm run build`.
- No runtime errors in the console.
- Keep the bundle minimal.

## Stretch (only after MVP)
- Add routing (react-router-dom) if multiple views are essential.
- Add a small chart or animation *only if* it clarifies the outcome.
