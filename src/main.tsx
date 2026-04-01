/**
 * Entry point for the React application.
 *
 * If you are new to React:
 * - `ReactDOM.createRoot(...)` tells React where in the HTML page to mount the app.
 * - `StrictMode` is a development-only helper that intentionally runs some logic twice
 *   to help you catch side effects and unsafe code patterns early.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// The non-null assertion (`!`) is safe here because Vite's `index.html` always includes #root.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
