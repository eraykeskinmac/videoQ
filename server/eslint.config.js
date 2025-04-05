import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["node_modules/**", "dist/**", "**/*.js"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    files: ["**/*.ts"],
    rules: {
      "no-console": "warn",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "no-constant-condition": "warn",
      "no-empty": "warn",
      "no-extra-semi": "error",
      "no-undef": "off",

      // Typescript specific rules
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // Stylistic rules
      semi: "off",
      "@typescript-eslint/semi": ["error", "always"],
      quotes: "off",
      "@typescript-eslint/quotes": ["error", "double"],
      "comma-dangle": "off",
      "@typescript-eslint/comma-dangle": ["error", "always-multiline"],
    },
  },
];
