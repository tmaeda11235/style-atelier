import type {
  Reporter,
  TestCase,
  TestResult,
  TestStep
} from "@playwright/test/reporter"

class VerboseReporter implements Reporter {
  onStepBegin(test: TestCase, result: TestResult, step: TestStep) {
    if (step.category === "test.step" || step.category === "pw:api") {
      const loc = step.location
      const locStr = loc
        ? `${loc.file}:${loc.line}:${loc.column}`
        : "unknown location"
      console.log(`[Step Begin] ${test.title} > ${step.title} (${locStr})`)
    }
  }
}

export default VerboseReporter
