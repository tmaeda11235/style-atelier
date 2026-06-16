import { defineConfig, mergeConfig } from "vitest/config"

import baseConfig from "./vitest.config"

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: [
        "tests/unit/lib/mj-parser.test.ts",
        "tests/unit/lib/prompt-utils.test.ts",
        "tests/unit/lib/nlp-utils.test.ts",
        "tests/unit/lib/color-utils.test.ts"
      ]
    }
  })
)
