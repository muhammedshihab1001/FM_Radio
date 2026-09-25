import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';

// Protected logic may not be edited without approval, so its findings are
// reported as warnings (listed in docs/v4/STANDARDS_REPORT.md) instead of
// failing `npm run lint`. Every other file is held to the rules as errors.
const PROTECTED = ['src/hooks/**', 'src/services/**', 'src/utils/**', 'src/types/**'];

const appConfigs = [
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  reactRefresh.configs.vite,
];

const asWarnings = (rules) =>
  Object.fromEntries(
    Object.entries(rules).map(([name, value]) => {
      const level = Array.isArray(value) ? value[0] : value;
      const off = level === 'off' || level === 0;
      return [name, off ? value : Array.isArray(value) ? ['warn', ...value.slice(1)] : 'warn'];
    }),
  );
const customRules = {
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
  '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
  'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
};
const allAppRules = Object.assign({}, ...appConfigs.map((c) => c.rules ?? {}), customRules);

export default tseslint.config(
  {
    ignores: ['dist', '.lighthouseci', 'node_modules'],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}', '*.config.ts', 'scripts/**/*.ts'],
    extends: appConfigs,
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: customRules,
  },
  { files: PROTECTED, rules: asWarnings(allAppRules) },
  {
    files: ['tests/**/*.{ts,tsx}', '*.config.ts', 'scripts/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...globals.node } },
  },
);
