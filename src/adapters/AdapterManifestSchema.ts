import { z } from 'zod'

// Zod validates *structural* errors (missing id, wrong primitive types). It
// can't introspect React component values, so `components` / `Wrapper` /
// `classMap` / `mount` / `unmount` are typed as `z.unknown()`. The schema
// catches the failure modes plugin authors actually hit at boot time:
// forgetting `id`, mistyping `displayName`, wrong shape for `themeTokens`.

export const adapterManifestSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  components: z.record(z.string(), z.unknown()),
  Wrapper: z.unknown().optional(),
  themeTokens: z.record(z.string(), z.string()).optional(),
  classMap: z.unknown().optional(),
  mount: z.unknown().optional(),
  unmount: z.unknown().optional(),
})
