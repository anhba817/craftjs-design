import { z } from 'zod'

export const documentSchema = z.object({
  version: z.literal(1),
  adapterId: z.string(),
  // Opaque to us — Craft.js owns its serialization shape. We validate that it
  // exists and is a string; the actual tree structure is Craft's concern.
  craftJson: z.string(),
})

export type EditorDocument = z.infer<typeof documentSchema>

export const STORAGE_KEY = 'craftjs-design:doc:v1'
