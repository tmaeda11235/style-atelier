import { render, screen } from "@testing-library/react";
import { Bubble } from "./Bubble";
import type { PromptSegment } from "../../lib/db-schema";

describe("Bubble", () => {
  it("renders text segment correctly", () => {
    const segment: PromptSegment = { id: "1", type: "text", value: "Hello, World!" };
    render(<Bubble segment={segment} onClick={() => {}} />);
    expect(screen.getByText("Hello, World!")).toBeInTheDocument();
  });
});