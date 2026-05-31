// Batteries-included dist entry: `@crafted-design/editor`.
//
// = the lean `/core` entry (editor + shadcn + themes/panels/templates/
// canonicals) PLUS the MUI adapter pre-registered. Hosts that don't want
// MUI's weight import `@crafted-design/editor/core` instead and add
// adapters à la carte from `@crafted-design/editor/adapters/<id>`.
//
// Because this entry registers MUI, importing it requires `@mui/material`
// (+ @emotion) to be installed — they're optional peer dependencies
// (Phase 16 § 8.3 / decision 2). The `/core` path needs none of them.
//
// All registration + the full export surface live in ./core; this module
// adds the MUI registration side-effect and re-exports core's surface.

import './core'
import './adapters/mui'

export * from './core'
