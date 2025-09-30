import js from '@eslint/js';

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
    rules: {}
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
];
