# Vibe Coding Starter (React + Vite)

A tiny scaffold to help you build a **quiz, game, site, dashboard, or landing page** in under an hour.
Works great in **GitHub Codespaces** and includes **Copilot instructions** to steer your build.

## Quickstart

**Option A — Codespaces**  
1. Open this repo in GitHub and click **Code → Codespaces → Create codespace**.  
2. The dev container installs Node and runs `npm install` automatically.  
3. Run `npm run dev` to start the dev server.

**Option B — Local**  
1. Install **Node.js 18+**.  
2. `npm install`  
3. `npm run dev`

Then open the URL shown in your terminal.

## Structure

```
.
├── .devcontainer/
│   └── devcontainer.json
├── .github/
│   └── copilot-instructions.md
├── src/
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
├── .gitignore
├── .editorconfig
└── README.md
```

## Tips

- Delete anything you don't need. Keep it **lean**.
- Use the **Prompts** inside `.github/copilot-instructions.md` as your running chat with Copilot.
- Aim for a **single, clear MVP** first (one page, one core action).
- If you need routing later, add it (e.g., `react-router-dom`) *after* your MVP works.

## License

MIT
