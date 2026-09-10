import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "@typescript-eslint/eslint-plugin";

const baseDirectory = path.dirname(fileURLToPath(import.meta.url));

// Next 16 removed the `next lint` subcommand, so ESLint runs directly against
// the legacy `next/core-web-vitals` preset via the flat-compat bridge.
const compat = new FlatCompat({ baseDirectory });

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "public/**",
      "coverage/**",
      "scripts/*.json",
      "prisma/universities-seed.json",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx,jsx}"],
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      // Intentional existing patterns across the codebase: explicit `any` is
      // used for Prisma/JSON shapes and legacy args arrive unused behind
      // `_`-prefixed names. Kept as `warn` so they surface without failing.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@next/next/no-img-element": "warn",
      // Apostrophes/quotes render identically and appear throughout product
      // copy; the rule is scoped to the characters that actually break JSX
      // rendering (`>` and `}`).
      "react/no-unescaped-entities": ["error", { forbid: [">", "}"] }],
    },
  },
];

export default config;