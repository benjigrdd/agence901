import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';

/**
 * Config ESLint du dashboard : Next (React, Hooks, jsx-a11y deja enregistres)
 * + regles jsx-a11y recommandees completes.
 */
export default [
  { ignores: ['.next/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts'] },
  ...nextVitals,
  ...nextTs,
  {
    files: ['**/*.{jsx,tsx}'],
    rules: { ...jsxA11y.flatConfigs.recommended.rules },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  prettier,
];
