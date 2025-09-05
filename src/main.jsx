import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

console.log('Main.jsx is loading...')

const root = createRoot(document.getElementById('root'))
console.log('Root created, rendering App...')
root.render(<App />)
