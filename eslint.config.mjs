import js from "@eslint/js";
import ts from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import sonarjs from "eslint-plugin-sonarjs";
import boundaries from "eslint-plugin-boundaries";
import importPlugin from "eslint-plugin-import";

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    // Apply core settings to all application source files
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
      sonarjs,
      boundaries,
      import: importPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"]
        },
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json"
        }
      },
      "boundaries/elements": [
        {
          type: "ui",
          mode: "file",
          pattern: [
            "src/components/**/*",
            "src/pages/**/*",
            "src/tabs/**/*",
            "src/options.tsx",
            "src/popup.tsx"
          ]
        },
        {
          type: "db",
          mode: "file",
          pattern: "src/lib/db.ts"
        }
      ]
    },
    rules: {
      // React Hooks rules (make them warnings to prevent blockages on existing code)
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",

      // Disable or ease strict TypeScript/ESLint rules that error on existing code
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "prefer-const": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/no-wrapper-object-types": "warn",
      "@typescript-eslint/ban-ts-comment": "off",

      // Cognitive Complexity (eslint-plugin-sonarjs)
      "sonarjs/cognitive-complexity": ["error", 15],

      // Max lines limits
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 50, skipBlankLines: true, skipComments: true }],

      // Boundaries rules
      "boundaries/entry-point": "off",
      "boundaries/no-unknown": "off",
      "boundaries/no-unknown-files": "off",
      "boundaries/dependencies": [
        "error",
        {
          default: "allow",
          message: "{{file.type}} is not allowed to import {{dependency.type}}",
          rules: [
            {
              from: { type: "ui" },
              disallow: [
                { to: { type: "db" } }
              ]
            }
          ]
        }
      ]
    },
  },
  // Overrides for test files to ease complexity and architecture rules
  {
    files: ["**/*.test.{ts,tsx,js,jsx}", "**/*.spec.{ts,tsx,js,jsx}"],
    rules: {
      "sonarjs/cognitive-complexity": "off",
      "max-lines": "off",
      "max-lines-per-function": "off",
      "boundaries/dependencies": "off",
    }
  },
  // Overrides for pre-existing highly complex files to prevent build failures during migration
  {
    files: [
      "src/lib/google-drive.ts",
      "src/lib/db.ts",
      "src/lib/color-utils.ts",
      "src/lib/db-setup.ts",
      "src/lib/export-utils.ts",
      "src/lib/image-utils.ts",
      "src/lib/nlp-utils.ts",
      "src/lib/prompt-utils.ts",
      "src/lib/backup-validator.ts"
    ],
    rules: {
      "max-lines": "warn",
      "max-lines-per-function": "warn",
      "sonarjs/cognitive-complexity": "warn",
    }
  },
  // Overrides for pre-existing UI files violating boundaries or complexity limits (migration baseline)
  {
    files: [
      "src/components/molecules/AutocompleteDropdown.tsx",
      "src/components/molecules/HistoryCard.tsx",
      "src/components/organisms/CardDetailView.tsx",
      "src/components/organisms/EasyModeView.tsx",
      "src/components/organisms/ExpertModeView.tsx",
      "src/components/organisms/HandBar.tsx",
      "src/components/organisms/InteractiveTutorial.tsx",
      "src/components/organisms/MintingView.tsx",
      "src/components/organisms/ParameterEditor.tsx",
      "src/components/organisms/SettingsTab.tsx",
      "src/components/organisms/SimpleMintingView.tsx",
      "src/components/organisms/SimpleWorkbenchModal.tsx",
      "src/components/organisms/Workbench.tsx"
    ],
    rules: {
      "boundaries/dependencies": "warn",
      "max-lines-per-function": "warn",
      "sonarjs/cognitive-complexity": "warn"
    }
  },
  // Overrides for hooks and contexts to ease complexity rules (baseline)
  {
    files: ["src/hooks/**/*.{ts,tsx}", "src/contexts/**/*.{ts,tsx}"],
    rules: {
      "max-lines": "warn",
      "max-lines-per-function": "warn",
      "sonarjs/cognitive-complexity": "warn"
    }
  },
  // Overrides for components, pages, and content scripts to ease complexity rules (baseline)
  {
    files: [
      "src/components/**/*.{ts,tsx}",
      "src/pages/**/*.{ts,tsx}",
      "src/contents/**/*.{ts,tsx,js,jsx}"
    ],
    rules: {
      "max-lines": "warn",
      "max-lines-per-function": "warn",
      "sonarjs/cognitive-complexity": "warn"
    }
  }
);
