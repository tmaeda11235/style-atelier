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
            "src/features/**/*",
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
        },
        {
          type: "web-app",
          mode: "file",
          pattern: "src/web-app/**/*"
        },
        {
          type: "shared",
          mode: "file",
          pattern: "src/shared/**/*"
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
            },
            {
              from: { type: "web-app" },
              disallow: [
                { to: { type: "components" } },
                { to: { type: "hooks" } },
                { to: { type: "db" } },
                { to: { type: "lib" } }
              ]
            }
          ]
        }
      ],
      "react/forbid-elements": [
        "error",
        {
          "forbid": [
            {
              "element": "button",
              "message": "Use <Button> or <IconButton> from 'src/components/atoms/Button' instead."
            },
            {
              "element": "input",
              "message": "Use <Input> from 'src/components/atoms/Input' instead."
            },
            {
              "element": "img",
              "message": "Use <OpfsImage> or <ImageThumbnailItem> from 'src/components/atoms/' instead."
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
      "src/features/minting/components/MintingView.tsx",
      "src/features/card-detail/components/CardDetailView.tsx",
      "src/components/organisms/Workbench.tsx",
      "src/features/tutorial/components/InteractiveTutorial.tsx",
      "src/features/settings/components/WebLlmSettingsSection.tsx",
      "src/components/organisms/SimpleWorkbenchModal.tsx",
      "src/components/organisms/SlotVariablesSection.tsx",
      "src/features/settings/components/StorageManagerSection.tsx",
      "src/features/category-manager/components/CategoryManagerModal.tsx",
      "src/features/settings/components/CloudSyncSection.tsx",
      "src/features/settings/components/LocalBackupSection.tsx",
      "src/components/organisms/Cauldron.tsx",
      "src/components/molecules/AssociatedImageGallery.tsx",
      "src/components/molecules/TagEditor.tsx",
      "src/components/molecules/HistoryCard.tsx",
      "src/components/molecules/HistoryEmptyState.tsx",
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
      "src/features/tutorial/components/OnboardingGuide.tsx",
      "src/features/tutorial/components/OnboardingGuideComponents.tsx"
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
  // 5. Files violating react/forbid-elements (button, input, img etc)
  {
    files: [
      "src/placeholder-non-existent-forbid-elements.ts",
      "src/components/P2PSyncCommonViews.tsx",
      "src/components/P2PSyncGuestView.tsx",
      "src/components/P2PSyncHostView.tsx",
      "src/components/molecules/AiModelStatusOverlays.tsx",
      "src/components/molecules/AiWarningModal.tsx",
      "src/components/molecules/AliasEditModal.tsx",
      "src/components/molecules/AspectRatioSelector.tsx",
      "src/components/molecules/AutocompleteDropdown.tsx",
      "src/components/molecules/CardThumbnail.tsx",
      "src/components/molecules/CardThumbnailMoreMenu.tsx",
      "src/components/molecules/ColorPaletteFilter.tsx",
      "src/components/molecules/ConfirmationDialog.tsx",
      "src/components/molecules/ConnectionAlert.tsx",
      "src/components/molecules/ExportSuccessModal.tsx",
      "src/components/molecules/FeatureToggleItem.tsx",
      "src/components/molecules/GDriveSyncStrategyDialog.tsx",
      "src/components/molecules/GenealogySection.tsx",
      "src/components/molecules/GlobalDownloadIndicator.tsx",
      "src/components/molecules/HistoryCard.tsx",
      "src/components/molecules/HueSliderFilter.tsx",
      "src/components/molecules/ImportNotificationBanner.tsx",
      "src/components/molecules/InterfaceModeToggle.tsx",
      "src/components/molecules/KeywordChip.tsx",
      "src/components/molecules/LocalAiSetupPlaceholder.tsx",
      "src/components/molecules/ModelFiltersRow.tsx",
      "src/components/molecules/ModelIdleOverlay.tsx",
      "src/components/molecules/ParameterArrayEditor.tsx",
      "src/components/molecules/PromptBubble.tsx",
      "src/components/molecules/RaritySelector.tsx",
      "src/components/molecules/SettingsAccordionItem.tsx",
      "src/components/molecules/SlotField.tsx",
      "src/components/molecules/SlotSuggestionsDropdown.tsx",
      "src/components/molecules/TagEditor.tsx",
      "src/components/molecules/WebGpuWarning.tsx",
      "src/components/organisms/AiRecipeAdviceSection.tsx",
      "src/components/organisms/AiStyleAnalysisSection.tsx",
      "src/features/settings/components/BrandLogoSettingsSection.tsx",
      "src/features/card-detail/components/CardDetailView/SubSections.tsx",
      "src/components/organisms/CardsGrid.tsx",
      "src/components/organisms/CategoryFilters.tsx",
      "src/features/category-manager/components/CategoryManagerModal/CardSelectionView.tsx",
      "src/features/category-manager/components/CategoryManagerModal/CategoryForm.tsx",
      "src/features/category-manager/components/CategoryManagerModal/CategoryList.tsx",
      "src/features/category-manager/components/CategoryManagerModal/CategoryModalHeader.tsx",
      "src/features/category-manager/components/CategoryManagerModal/CoverSettingsFields.tsx",
      "src/features/settings/components/CloudSyncSection.tsx",
      "src/features/settings/components/DangerZoneSection.tsx",
      "src/components/organisms/DbErrorOverlay.tsx",
      "src/components/organisms/EmptyState.tsx",
      "src/components/organisms/EvolutionSuccessModal.tsx",
      "src/components/organisms/ExpertModeView/WelcomeDialog.tsx",
      "src/components/organisms/FolderExplorer.tsx",
      "src/components/organisms/HandBarScrollArea.tsx",
      "src/components/organisms/HandBarScrollButton.tsx",
      "src/components/organisms/LibraryFilterAccordion.tsx",
      "src/components/organisms/LibrarySearchBar.tsx",
      "src/features/settings/components/LocalBackupSection.tsx",
      "src/components/organisms/MergeStackMaterialList.tsx",
      "src/features/minting/components/MintingView.tsx",
      "src/features/minting/components/MintingView/CardIdentitySubSections.tsx",
      "src/features/minting/components/MintingView/MintingViewContent.tsx",
      "src/components/organisms/NonTargetSiteView.tsx",
      "src/features/tutorial/components/OnboardingGuide.tsx",
      "src/features/tutorial/components/OnboardingGuideComponents.tsx",
      "src/components/organisms/ParameterEditor.tsx",
      "src/components/organisms/ParameterEditor/AdvancedParametersSection.tsx",
      "src/components/organisms/PortionExtractorOverlay.tsx",
      "src/components/organisms/PromptBubbleEditor.tsx",
      "src/components/organisms/PromptDeclutterControls.tsx",
      "src/components/organisms/ShareCardModal.tsx",
      "src/components/molecules/simple-minting/KeywordSuggestions.tsx",
      "src/components/molecules/simple-minting/ThumbnailPreview.tsx",
      "src/components/organisms/SimpleWorkbenchModal.tsx",
      "src/features/settings/components/StorageManagerSection.tsx",
      "src/components/organisms/SyncStatusMessage.tsx",
      "src/components/organisms/TipsBar.tsx",
      "src/features/tutorial/components/TutorialTooltip.tsx",
      "src/features/settings/components/UiPreferencesSection.tsx",
      "src/components/organisms/WorkbenchCard.tsx",
      "src/components/organisms/WorkbenchHeader.tsx",
      "src/components/templates/SidePanelDebugLogs.tsx",
      "src/components/templates/SidePanelHeader.tsx",
      "src/tabs/share-components.tsx",
      "src/web-app/components/LandingPage.tsx",
      "src/web-app/components/MobilePwaViewer.tsx",
      "src/web-app/components/PrivacyPolicy.tsx",
    ],
    rules: {
      "react/forbid-elements": "warn"
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
  },
  // Disable forbid-elements for atoms definition files
  {
    files: ["src/components/atoms/**/*.{ts,tsx}"],
    rules: {
      "react/forbid-elements": "off"
    }
  },
  // Restrict imports for CVA variants definition files
  {
    files: ["src/**/*.variants.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          "paths": [
            {
              "name": "react",
              "message": "Pure variants definition files (*.variants.ts) must not import react."
            }
          ],
          "patterns": [
            {
              "group": ["**/components/**/*"],
              "message": "Pure variants definition files (*.variants.ts) must not import UI components."
            }
          ]
        }
      ]
    }
  }
);
