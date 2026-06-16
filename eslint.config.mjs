import js from "@eslint/js";
import ts from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import sonarjs from "eslint-plugin-sonarjs";
import boundaries from "eslint-plugin-boundaries";
import importPlugin from "eslint-plugin-import";
import i18next from "eslint-plugin-i18next";


export default ts.config(
  {
    ignores: ["postcss.config.js", "scratch/**/*", "assets/**/*"]
  },
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
      i18next,
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
          type: "components",
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
          type: "hooks",
          mode: "file",
          pattern: [
            "src/hooks/**/*",
            "src/contexts/**/*"
          ]
        },
        {
          type: "db",
          mode: "file",
          pattern: "src/lib/db.ts"
        },
        {
          type: "lib",
          mode: "file",
          pattern: "src/lib/**/*"
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
      "preserve-caught-error": "off",
      "no-useless-assignment": "warn",

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
              from: { type: "components" },
              disallow: [
                { to: { type: "db" } }
              ]
            }
          ]
        }
      ]
    },
  },
  // Overrides for pre-existing highly complex files to prevent build failures during migration
  // 1. Files violating max-lines (300 lines limit)
  {
    files: [
      "src/placeholder-non-existent-max-lines.ts",
      "src/components/organisms/Workbench.tsx",
    ],
    rules: {
      "max-lines": "warn"
    }
  },
  // 2. Files violating sonarjs/cognitive-complexity (15 limit)
  {
    files: [
      "src/placeholder-non-existent-complexity.ts",
    ],
    rules: {
      "sonarjs/cognitive-complexity": "warn"
    }
  },
  // 3. Files violating max-lines-per-function (50 limit)
  {
    files: [
      "src/placeholder-non-existent-func-lines.ts",
      "src/components/molecules/AutocompleteDropdown.tsx",
      "src/components/molecules/ConnectionAlert.tsx",
      "src/components/organisms/DangerZoneSection.tsx",
      "src/components/organisms/EvolutionSuccessModal.tsx",
      "src/components/organisms/HistoryTab.tsx",
      "src/components/organisms/InteractiveTutorial.tsx",
      "src/components/organisms/LocalBackupSection.tsx",
      "src/components/organisms/OnboardingGuide.tsx",
      "src/components/organisms/SimpleMintingView.tsx",
      "src/components/organisms/StorageManagerSection.tsx",
      "src/components/organisms/Workbench.tsx",
      "src/hooks/useEasyModeView.ts",
    ],
    rules: {
      "max-lines-per-function": "warn"
    }
  },
  // 4. Enforce i18n literal checks for fully-translated files
  {
    files: [
      "src/components/molecules/DeleteConfirmModal.tsx",
      "src/components/organisms/HistoryTab.tsx",
      "src/components/organisms/SettingsTab.tsx",
      "src/components/organisms/MintingView.tsx",
      "src/components/organisms/CardDetailView.tsx",
      "src/components/organisms/Workbench.tsx",
      "src/components/organisms/InteractiveTutorial.tsx",
      "src/components/organisms/WebLlmSettingsSection.tsx",
      "src/components/organisms/SimpleWorkbenchModal.tsx",
      "src/components/organisms/SlotVariablesSection.tsx",
      "src/components/organisms/StorageManagerSection.tsx",
      "src/components/organisms/CategoryManagerModal.tsx",
      "src/components/organisms/CloudSyncSection.tsx",
      "src/components/organisms/LocalBackupSection.tsx",
      "src/components/organisms/Cauldron.tsx",
      "src/components/molecules/AssociatedImageGallery.tsx",
      "src/components/molecules/TagEditor.tsx",
      "src/components/molecules/HistoryCard.tsx",
      "src/components/molecules/GenealogySection.tsx",
      "src/components/molecules/ConfirmationDialog.tsx",
      "src/components/molecules/ParameterArrayEditor.tsx",
      "src/components/organisms/AiStyleAnalysisSection.tsx",
      "src/components/organisms/AiRecipeAdviceSection.tsx",
      "src/components/organisms/SimpleMintingView.tsx",
      "src/components/molecules/GDriveSyncStrategyDialog.tsx",
      "src/components/organisms/HandBar.tsx",
      "src/components/molecules/WebGpuWarning.tsx",
      "src/components/organisms/LibraryFilterAccordion.tsx",
      "src/components/organisms/LibrarySearchBar.tsx",
      "src/components/organisms/OnboardingGuide.tsx",
      "src/components/organisms/OnboardingGuideComponents.tsx"
    ],
    rules: {
      "i18next/no-literal-string": [
        "error",
        {
          mode: "jsx-only",
          "jsx-attributes": {
            exclude: [
              "className",
              "styleName",
              "style",
              "type",
              "key",
              "id",
              "width",
              "height",
              "variant",
              "size",
              "target",
              "rel",
              "href",
              "data-testid",
              "data-tutorial",
              "position",
              "advanceIfStep",
              "title",
              "aria-label",
              "direction",
              "behavior",
              "value",
              "strategyValue"
            ]
          },
          words: {
            exclude: [
              "[0-9!-/:-@[-`{-~]+",
              "[A-Z_-]+",
              "^[0-9]+(px|rem|em|%|ms|s|deg)$",
              "^[\\p{Emoji}\\p{Extended_Pictographic}\\s]+$"
            ]
          }
        }
      ]
    }
  },
  // Overrides for test files to ease complexity and architecture rules
  // (Must be at the end to ensure it overrides any production file rules that matched test files)
  {
    files: ["**/*.test.{ts,tsx,js,jsx}", "**/*.spec.{ts,tsx,js,jsx}"],
    rules: {
      "sonarjs/cognitive-complexity": "off",
      "max-lines": "off",
      "max-lines-per-function": "off",
      "boundaries/dependencies": "off",
      // Ease strict TypeScript rules for test files relocated outside src/
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/no-wrapper-object-types": "warn",
      "@typescript-eslint/ban-ts-comment": "off",
    }
  }
);
