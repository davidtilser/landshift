import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier/flat'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist/**', 'coverage/**']),
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx,mts,cts}'],
    ignores: ['src/globe/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'ImportExpression[source.value=/^(three|globe\\.gl)(\\/|$)/]',
          message: 'Only src/globe may import globe.gl or three.',
        },
      ],
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['globe.gl', 'three', 'three/*'],
              message: 'Only src/globe may import globe.gl or three.',
            },
          ],
        },
      ],
    },
  },
  prettier,
])
