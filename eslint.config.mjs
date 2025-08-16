import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginNext from "@next/eslint-plugin-next";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/*.config.js",
      "**/*.config.cjs",
      "**/*.config.mjs",
      "**/.env*",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: {
      js,
      react: pluginReact,
      "@next/next": pluginNext
    },
    extends: [
      "js/recommended"
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      // React
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",

      // Next.js rules (aggiungi quelle che vuoi, le principali sono queste)
      "@next/next/no-html-link-for-pages": "error",
      "@next/next/no-head-element": "warn",
      "@next/next/no-sync-scripts": "warn",
      "@next/next/no-css-tags": "warn"
      // puoi aggiungerne altre dalla lista qui: https://github.com/vercel/next.js/tree/canary/packages/eslint-plugin-next/docs/rules
    }
  },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
]);