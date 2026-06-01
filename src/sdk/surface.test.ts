import { describe, expect, it } from 'vitest'
import * as core from '@/core'
import * as sdk from '@/sdk'

// Phase 17 § Group C — the FROZEN public runtime surface (the 1.0 gate).
//
// These lists are the package's public API contract. Adding or removing an
// exported name is a deliberate SemVer event: update the list here AND the
// CHANGELOG in the same commit. After 1.0, removing or renaming any name below
// is a BREAKING (major) change — see SDK_GUIDE.md "Public API stability".
//
// Runtime values only (functions, components, consts). Type-only exports are
// erased at runtime and are governed by the emitted `.d.ts` + tsc; the most
// damaging drift — an accidental value export leaking an internal, or a
// silent removal breaking consumers — is what this snapshot catches.
//
// Two entry points share one surface: `@crafted-design/editor/sdk` is the
// authoring surface; `@crafted-design/editor` (and `/core`) re-export all of
// it (`export * from './sdk'`) PLUS the editor-only runtime below.

const SDK_SURFACE = [
  'EditableText',
  'EditorColorVariablesProvider',
  'EditorImageProvider',
  'GOOGLE_FONTS',
  'OverlayCard', // Phase 18 § 5 — overlay authoring seam
  'SLIDE_SLOT_PREFIX',
  'SYSTEM_FONTS',
  'TAB_SLOT_PREFIX',
  'TelemetryProvider',
  // Phase 18 follow-up — Stepper + Table dynamic-canvas slot/geometry helpers
  'CELL_PREFIX',
  'STEP_SLOT_PREFIX',
  'containingMerge',
  'isCellCovered',
  'stepperSlotKey',
  'stepperSlotKeys',
  'tableCellSlotKey',
  'tableCellSlotKeys',
  'cn', // Phase 18 § 5 — class-merge util
  'defaultImageProvider',
  'deriveTokens',
  'readOverlayOpen', // Phase 18 § 5 — overlay runtime
  'useOverlayRuntime', // Phase 18 § 5 — overlay runtime
  'useOverlayStageTarget', // Phase 18 § 5 — overlay-stage portal target
  'getApplicablePanels',
  'getCanvasSlots',
  'getComponent',
  'getComponentByDisplayName',
  'getPanelsFor',
  'getStorageAdapter',
  'getTelemetry',
  'getTemplate',
  'getTheme',
  'googleFontsHref',
  'listAdapters',
  'listComponents',
  'listFontTokens',
  'listPanels',
  'listTemplates',
  'listThemes',
  'registerAdapter',
  'registerCanonical',
  'registerComponent',
  'registerFontToken',
  'registerGoogleFonts',
  'registerPanel',
  'registerSystemFonts',
  'registerTemplate',
  'registerTheme',
  'setStorageAdapter',
  'setTelemetry',
  'slideSlotKeys',
  'tabSlotKeys',
  'themeTokensToCss',
  'uniqueTabValues',
  'unregisterAdapter',
  'unregisterCanonical',
  'unregisterFontToken',
  'unregisterPanel',
  'unregisterTemplate',
  'unregisterTheme',
  'useActiveAdapter',
  'useColorVariables',
  'useEditorImageProvider',
  'useIsEditing',
  'useNodeClasses',
  'useNodeClassesMulti',
  'useStartTextEdit',
].sort()

// Editor-only runtime, exported from the editor entry but NOT the SDK: the
// `<Editor />` shell + its error boundary, the host-facing stores, and the
// document import/export helpers.
const CORE_EDITOR_ONLY = [
  'Editor',
  'ErrorBoundary',
  'TopShellErrorFallback',
  'ImportError',
  'downloadDocument',
  'exportDocument',
  'importDocumentFromFile',
  'parseDocumentJson',
  'useDocumentStore',
  'useEditorStore',
].sort()

const CORE_SURFACE = [...SDK_SURFACE, ...CORE_EDITOR_ONLY].sort()

// Internals that must NEVER appear in the public surface. CanonicalNode is the
// Craft.js bridge renderer (leaking it lets code mount nodes outside the
// editor's render flow); getResolver builds the Craft resolver from the
// registry (internal wiring).
const SEALED_INTERNALS = ['CanonicalNode', 'getResolver', 'buildResolver']

describe('frozen public surface', () => {
  it('the SDK entry exports exactly the frozen set', () => {
    expect(Object.keys(sdk).sort()).toEqual(SDK_SURFACE)
  })

  it('the editor entry exports the SDK surface + the editor-only runtime', () => {
    expect(Object.keys(core).sort()).toEqual(CORE_SURFACE)
  })

  it('the editor entry is a strict superset of the SDK entry', () => {
    for (const name of SDK_SURFACE) {
      expect(core, `editor entry must re-export ${name}`).toHaveProperty(name)
    }
  })

  it('leaks no internal renderer / resolver into either entry', () => {
    for (const name of SEALED_INTERNALS) {
      expect(name in sdk, `${name} must not be in the SDK surface`).toBe(false)
      expect(name in core, `${name} must not be in the editor surface`).toBe(
        false,
      )
    }
  })

  it('the core registration functions are callable', () => {
    for (const name of [
      'registerAdapter',
      'registerCanonical',
      'registerPanel',
      'registerTheme',
      'registerFontToken',
      'registerTemplate',
    ] as const) {
      expect(typeof (sdk as Record<string, unknown>)[name]).toBe('function')
    }
  })
})
