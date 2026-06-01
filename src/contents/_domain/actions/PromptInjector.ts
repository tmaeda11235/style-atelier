import type { IActionHandler } from "../interfaces"

export class PromptInjector implements IActionHandler {
    async handle(prompt: any): Promise<boolean> {
        if (typeof prompt !== "string") {
            console.error("Style Atelier: Invalid prompt format")
            return false
        }

        console.log("Style Atelier: Attempting to inject prompt:", prompt)

        // Try to find the input area
        // Expanded selectors for better compatibility
        let input = document.getElementById("prompt-textarea") ||
            document.querySelector('[aria-label="Imagine a prompt"]') ||
            document.querySelector('[aria-label="Prompt text"]') ||
            document.querySelector('[data-testid="prompt-input"]') ||
            document.querySelector('[role="textbox"]') ||
            document.querySelector('div[contenteditable="true"]') ||
            document.querySelector('textarea[placeholder*="Imagine"]') ||
            document.querySelector('textarea')

        if (input) {
            // Handle contenteditable div
            if (input.isContentEditable) {
                (input as HTMLElement).focus()
                // Using execCommand is deprecated but often works for contenteditable
                document.execCommand('selectAll', false, undefined)
                document.execCommand('insertText', false, prompt)
            } else {
                // Handle textarea/input
                // React override hack for input values
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                if (nativeInputValueSetter) {
                    nativeInputValueSetter.call(input, prompt);
                } else {
                    (input as HTMLTextAreaElement).value = prompt;
                }

                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                (input as HTMLElement).focus()
            }
            console.log("Style Atelier: Prompt injected successfully")
            return true
        } else {
            console.error("Style Atelier: Could not find chat input area. Checked selectors: #prompt-textarea, [aria-label], [role=textbox], contenteditable, textarea")
            return false
        }
    }
}