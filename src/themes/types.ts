export interface Theme {
  // Stable id stored in persisted documents (e.g. 'default', 'rose').
  id: string
  // Shown in the switcher UI.
  displayName: string
  // The value set on data-theme on the canvas wrapper. Empty string = no
  // attribute (use :root defaults).
  dataThemeValue: string
}
