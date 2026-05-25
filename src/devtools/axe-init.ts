// Phase 9 Group B — axe-core auto-scan in dev mode.
//
// @axe-core/react instruments React's render path; whenever the editor
// re-renders, axe runs against the current DOM and logs violations to the
// browser console. Findings come out as a structured list under
// "AXE-CORE" group entries — copy-paste-able for inclusion in
// ACCESSIBILITY.md.
//
// The 1000ms debounce avoids running on every keystroke; once-per-second is
// enough to catch state-driven a11y violations without flooding the console.
//
// This module is dynamically imported from main.tsx only in DEV mode, so the
// production dist bundle never pulls in @axe-core/react.

import React from "react";
import ReactDOM from "react-dom";

const DEBOUNCE_MS = 1000;

void import("@axe-core/react").then((axe) => {
  axe.default(React, ReactDOM, DEBOUNCE_MS, {
    // Run the default WCAG 2.1 AA rule set. Add `runOnly: { type: 'tag', values: ['wcag2aa'] }`
    // to scope tighter if needed.
  });
  console.info("[axe-core] auto-scan enabled (dev mode, debounced 1000ms)");
});
