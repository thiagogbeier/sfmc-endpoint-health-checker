import React, { useState } from 'react'

export default function App() {
  const [idea, setIdea] = useState('')

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: 16 }}>
      <h1>Vibe Coding Starter</h1>
      <p>
        Build a tiny MVP in under an hour: a quiz, mini-game, dashboard, or landing page.
        Keep it simple—one page, one core action.
      </p>

      <section>
        <label htmlFor="idea"><strong>Your idea</strong></label>
        <input
          id="idea"
          placeholder="e.g., 5-question onboarding quiz"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          style={{ width: '100%', padding: 12, marginTop: 8, marginBottom: 16 }}
        />
        <p>
          Suggested first step: sketch the UI in plain HTML/JSX below and wire it up.
          Add libraries only if you truly need them.
        </p>
      </section>

      <section>
        <h2>Starter UI</h2>
        <ul>
          <li>Single button with a click handler</li>
          <li>Form with a couple of inputs and state</li>
          <li>Simple list or table of items</li>
        </ul>
        <button onClick={() => alert('You shipped your first interaction!')}>Test Interaction</button>
      </section>

      <footer style={{ marginTop: 40 }}>
        <p>
          Check <code>.github/copilot-instructions.md</code> for focused prompts to guide Copilot.
        </p>
      </footer>
    </main>
  )
}
