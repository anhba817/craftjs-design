// React 18+ ships `useSyncExternalStore` natively, and the editor's React peer
// is `^19`. The `use-sync-external-store` *shim* package (pulled in transitively
// — e.g. by `@radix-ui/react-use-is-hydrated`) is CJS and does
// `require('react')`. When React is externalized in the library build
// (vite.config.dist.ts), the bundler can't turn that CJS require into an ESM
// import and leaves a bare `require("react")` in the output — which throws in a
// pure-ESM consumer ("Calling `require` for 'react' in an environment that
// doesn't expose the `require` function").
//
// Aliasing the shim to React's built-in hook (in vite.config.dist.ts) drops the
// CJS module entirely, so the published bundle is pure ESM. Safe because the
// shim only existed to back-fill React < 18, which we don't support.
export { useSyncExternalStore } from 'react'
