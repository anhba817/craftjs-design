import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dist-lib']),
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
])
