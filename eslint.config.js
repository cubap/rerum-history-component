import js from '@eslint/js'

export default [
  {
    ignores: ['node_modules/**', 'dist/**', '.vite/**']
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Node.js globals for config files
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
    rules: {
      // No terminal semicolons
      'semi': ['error', 'never'],
      // Prefer optional chaining
      'prefer-optional-chaining': 'off', // Not available in core ESLint
      // No else after return (prefer guard clauses)
      'no-else-return': ['error', { allowElseIf: false }],
      // Consistent brace style
      'curly': ['error', 'multi-line', 'consistent'],
      // Prefer template literals
      'prefer-template': 'error',
      // Prefer arrow callbacks
      'prefer-arrow-callback': 'error',
      // No var
      'no-var': 'error',
      // Prefer const
      'prefer-const': 'error'
    }
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        CustomEvent: 'readonly',
        HTMLElement: 'readonly',
        customElements: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        Array: 'readonly',
        String: 'readonly',
        console: 'readonly',
      }
    }
  }
]
