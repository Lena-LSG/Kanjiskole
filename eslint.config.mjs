// Lint: typescript-eslint's type-aware rules (they catch floating promises, unsafe `any`, needless conditions) and the
// React hooks rules (stale closures, hooks called conditionally). Style is left to the code as written: no formatter
// churn, rules only where they find bugs.
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/node_modules/", ".cache/", "app/dist/", "app/android/", "app/ios/", "app/.expo/", "docs/prototype/", "assets/", "**/*.d.ts", "eslint.config.mjs", "vitest.config.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Metro resolves assets with require(); that's the platform, not a style choice.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
