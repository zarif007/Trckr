import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InlineEditableName } from "./InlineEditableName";

describe("InlineEditableName", () => {
  it("commits on Enter when draft differs", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InlineEditableName value="Alpha" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /Alpha/i }));
    const input = screen.getByDisplayValue("Alpha");
    await user.clear(input);
    await user.type(input, "Beta");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("Beta");
  });

  it("reverts on Escape without calling onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InlineEditableName value="Keep" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /Keep/i }));
    const input = screen.getByDisplayValue("Keep");
    await user.type(input, "X");
    await user.keyboard("{Escape}");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Keep")).toBeInTheDocument();
  });

  it("activates edit mode with Enter on the button", async () => {
    const user = userEvent.setup();
    render(<InlineEditableName value="Section" onChange={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /Section/i });
    btn.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByDisplayValue("Section")).toBeInTheDocument();
  });
});
