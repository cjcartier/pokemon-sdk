import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'array-callback-return': [
        'error',
        {
          allowImplicit: true,
          checkForEach: true,
        },
      ],
      'arrow-body-style': ['error', 'as-needed'],
      curly: ['error', 'multi', 'consistent'],
      'eol-last': ['error', 'always'],
      eqeqeq: ['error', 'smart'],
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],
      'func-style': ['error', 'expression'],
      'jsx-quotes': ['error', 'prefer-double'],
      'newline-before-return': 'warn',
      'no-lonely-if': 'error',
      'no-nested-ternary': 'error',
      'no-shadow': [
        'error',
        {
          builtinGlobals: false,
          hoist: 'functions',
        },
      ],
      'no-unneeded-ternary': ['error', { defaultAssignment: false }],
      'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-const': [
        'error',
        {
          destructuring: 'all',
        },
      ],
      quotes: [
        'error',
        'single',
        {
          avoidEscape: true,
          allowTemplateLiterals: false,
        },
      ],
      'sort-imports': [
        'error',
        {
          ignoreDeclarationSort: true,
        },
      ],
      'spaced-comment': ['error', 'always'],
    },
  },
]);
