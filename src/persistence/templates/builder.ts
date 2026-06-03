import {
  buildDocument,
  type HeadlessNodeSpec,
} from '@/headless/build'
import type { EditorDocument } from '../schema'

// Template builder — now a thin wrapper over the Phase 21 headless
// document builder (src/headless/build.ts), which generalized this module
// into the public `@crafted-design/editor/headless` API (Pattern B slots,
// schema-checked props, readable ids). Kept as a separate name so template
// registrations read naturally and existing callers don't churn.
//
// Note: the headless builder is STRICTER than the original — children on a
// leaf canonical (or on a Pattern B canonical, which takes `slots`) throw
// instead of being silently dropped.

export type NodeSpec = HeadlessNodeSpec

export interface TemplateBuildOptions {
  adapterId?: string
  themeId?: string
  root: NodeSpec
}

export function buildTemplate(options: TemplateBuildOptions): EditorDocument {
  return buildDocument({
    root: options.root,
    adapterId: options.adapterId,
    themeId: options.themeId,
  })
}
