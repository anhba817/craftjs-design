import { z } from 'zod'

export const documentSchema = z.object({
  version: z.literal(1),
  adapterId: z.string(),
  // Optional — Phase 1 documents saved before themes existed parse fine without
  // it. Hydrator defaults to 'default' if missing.
  themeId: z.string().optional(),
  // Phase 12 § 4.13 — persisted light/dark/system color mode. Optional;
  // documents saved before it default to 'system' on load.
  colorMode: z.enum(['light', 'dark', 'system']).optional(),
  // Opaque to us — Craft.js owns its serialization shape. We validate that it
  // exists and is a string; the actual tree structure is Craft's concern.
  craftJson: z.string(),
})

export type EditorDocument = z.infer<typeof documentSchema>

export const STORAGE_KEY = 'craftjs-design:doc:v1'
