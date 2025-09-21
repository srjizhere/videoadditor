import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable unused variable errors that break the build
      "@typescript-eslint/no-unused-vars": "off",
      // Disable React Hook dependency warnings
      "react-hooks/exhaustive-deps": "warn",
      // Disable Next.js image optimization warnings
      "@next/next/no-img-element": "warn",
      // Disable accessibility warnings for now
      "jsx-a11y/alt-text": "warn",
    },
  },
];

export default eslintConfig;
