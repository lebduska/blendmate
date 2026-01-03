import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// load JetBrains Mono locally from @fontsource (woff2 bundled)
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import "./index.css";
import "./App.css";
import { initBlenderConnection } from "./stores/blenderStore";
// Initialize i18n before app renders
import "./i18n";

// Initialize Blender WebSocket connection
initBlenderConnection();

// Accessibility helper: add .user-is-tabbing to <html> when user navigates by keyboard
(function setupUserIsTabbing() {
  try {
    const doc = document.documentElement;
    function handleFirstTab(e: KeyboardEvent) {
      if (e.key === 'Tab') {
        doc.classList.add('user-is-tabbing');
        window.removeEventListener('keydown', handleFirstTab);
        window.addEventListener('mousedown', handleMouseDownOnce);
      }
    }
    function handleMouseDownOnce() {
      doc.classList.remove('user-is-tabbing');
      window.removeEventListener('mousedown', handleMouseDownOnce);
      window.addEventListener('keydown', handleFirstTab);
    }
    window.addEventListener('keydown', handleFirstTab);
  } catch (err) {
    // ignore in non-browser envs
  }
})();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
