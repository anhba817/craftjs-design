import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'dist-lib',
    'dist-demo',
    'dist-gallery',
    '.cli-check',
    '.cli-tmp',
    // Standalone sub-projects: their own tsconfig/vite/package.json (extra
    // candidate TSConfig roots the parser can't disambiguate). Excluded from
    // the repo's tsc build too; drift-checked separately by `check:example`.
    'examples/minimal-host',
    'examples/renderer-host',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      // examples/minimal-host is a standalone project with its own tsconfig,
      // so two candidate TSConfig roots exist; pin the parser to the repo root
      // explicitly (typescript-eslint can't auto-pick between them).
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // `_`-prefixed bindings are intentional discards (rest-spread drops,
      // unused destructure slots). Conventional ignore so they aren't errors.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      // eslint-plugin-react-hooks v7 ships React-Compiler-readiness rules, and
      // react-refresh ships a Fast-Refresh hint. This codebase predates the
      // compiler and doesn't use it; these rules fire on correct, shipped,
      // runtime-verified patterns, so they're OFF (refactoring valid code to
      // appease an advisory would only add regression risk):
      //   - immutability        → false-positive on ref-merge callbacks that
      //                            assign `ref.current = el` (the correct way
      //                            to set a ref) — see the MUI adapter impls.
      //   - set-state-in-effect  → flags legitimate external-sync / DOM-
      //                            measurement effects (matchMedia sync,
      //                            ResizeOverlay/selection-outline positioning).
      //   - refs                 → flags intentional ref reads during render.
      //   - static-components    → flags a dynamic component built per render.
      //   - incompatible-library → TanStack Virtual interop.
      //   - only-export-components → noise on barrels, context modules, and
      //                            shadcn `cva` variant co-exports.
      // The genuine bug-class rule (rules-of-hooks) stays an error (plugin
      // default). exhaustive-deps stays on (below) — it's the one with real
      // bug-catching value; its sites are all fixed or documented.
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-refresh/only-export-components': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  // Phase 10 § 2.5 — SDK boundary enforcement. Code under examples/**
  // (and, by documented convention, integration consumers' source trees)
  // must NOT import past the public SDK surface. The only allowed import
  // for accessing the editor's APIs is '@design/sdk' (the source-time
  // alias) or '@crafted-design/editor/sdk' (the published subpath).
  //
  // Blocking the entire '@/*' alias from examples is intentional: any
  // path under '@/*' is internal-by-default. New public surface gets
  // added to src/sdk/ explicitly.
  {
    files: ['examples/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/*'],
              message:
                'Examples must import from "@design/sdk" only. Reaching into "@/..." is past the SDK boundary — see docs/INTEGRATION_GUIDE.md ("Breaking-change policy").',
            },
          ],
        },
      ],
    },
  },

  // Phase 18 § 5 — dogfood the SDK in the built-in adapter IMPLEMENTATIONS.
  // Adapter component impls must reach the editor runtime / global state /
  // shared utils through "@design/sdk", not the "@/editor" · "@/state" ·
  // "@/lib" internals — the same boundary third-party adapters hit. If
  // something an adapter needs isn't exported, add a seam to src/sdk/ rather
  // than reaching past it. (Allowed: "@/components/ui" — the shadcn adapter's
  // own design-system primitives — and "@/registry/components" — the canonical
  // contract.) Scoped to the impl dirs only; the adapter infrastructure at
  // src/adapters/ root — AdapterContext / types / manifest — legitimately
  // owns editor-state wiring and is excluded.
  {
    files: [
      'src/adapters/shadcn/**/*.{ts,tsx}',
      'src/adapters/mui/**/*.{ts,tsx}',
      'src/adapters/html/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/editor',
                '@/editor/**',
                '@/state',
                '@/state/**',
                '@/lib',
                '@/lib/**',
              ],
              message:
                'Built-in adapter impls must reach editor/state/util internals through "@design/sdk", not "@/...". If the symbol you need isn\'t exported, add a seam to src/sdk/ — see docs/SDK_GUIDE.md ("Public API stability").',
            },
          ],
        },
      ],
    },
  },
])
