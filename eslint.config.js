import eslintPluginJsxA11y from 'eslint-plugin-jsx-a11y';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['.wxt/**', 'node_modules/**', 'dist/**', '.output/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'jsx-a11y': eslintPluginJsxA11y,
      'react-hooks': eslintPluginReactHooks,
    },
    rules: {
      'jsx-a11y/alt-text': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
    },
  },
);
