import { execSync } from 'node:child_process'

// Vitest global setup — runs once before the suite.
//
// `src/index.css` hard-`@import`s `src/style/safelist.generated.css`, which is
// gitignored and produced by `scripts/gen-safelist.ts`. The dev / build flows
// regenerate it via the `predev` / `prebuild` npm hooks, but a bare
// `vitest run` (CI's test step, or a fresh local checkout) has no such hook —
// so any test that imports `@/core` (e.g. surface.test.ts) pulls in index.css
// and fails to resolve the missing safelist. Generate it here so `vitest run`
// is self-sufficient regardless of how it's invoked.
export default function setup(): void {
  execSync('npm run gen-safelist', { stdio: 'inherit' })
}
