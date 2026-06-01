import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssociatedImageGallery } from "./AssociatedImageGallery";

describe("AssociatedImageGallery", () => {
  const mockImages = [
    "https://example.com/img1.png",
    "https://example.com/img2.png",
  ];

  it("renders images list and selection status", () => {
    render(
      <AssociatedImageGallery
        images={mockImages}
        selectedThumbs={["https://example.com/img2.png"]}
        onToggleThumbnail={vi.fn()}
      />
    );

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);

    expect(screen.getByText("Selected: 1 / 4")).toBeDefined();
    expect(screen.getByText("1st")).toBeDefined(); // selectedThumbs contains it at index 0
  });

  it("triggers onToggleThumbnail when image is clicked", () => {
    const mockToggle = vi.fn();
    render(
      <AssociatedImageGallery
        images={mockImages}
        selectedThumbs={[]}
        onToggleThumbnail={mockToggle}
      />
    );

    const images = screen.getAllByRole("img");
    fireEvent.click(images[0]);

    expect(mockToggle).toHaveBeenCalledWith("https://example.com/img1.png");
  });
});
