import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Phase 9 Group B — axe-core auto-scans the editor on every render in dev
// mode and emits findings to the browser console. Production builds skip
// the import entirely via the import.meta.env guard.
if (import.meta.env.DEV) {
  void import("./devtools/axe-init")
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
