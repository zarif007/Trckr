import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TrackerEmptyState } from "./TrackerEmptyState";

describe("TrackerEmptyState", () => {
  it("renders schema-mode heading copy", () => {
    render(<TrackerEmptyState onApplySuggestion={vi.fn()} mode="schema" />);
    expect(screen.getByText(/Build your/)).toBeInTheDocument();
    expect(
      screen.getByText("Describe what you need in plain English."),
    ).toBeInTheDocument();
  });

  it("uses data mode copy when mode is data", () => {
    render(<TrackerEmptyState onApplySuggestion={vi.fn()} mode="data" />);
    expect(screen.getByText(/Understand your/)).toBeInTheDocument();
  });

  it("renders suggestion chips for schema mode", () => {
    render(<TrackerEmptyState onApplySuggestion={vi.fn()} mode="schema" />);
    expect(screen.getAllByText("Fitness log").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Inventory").length).toBeGreaterThanOrEqual(1);
  });
});
