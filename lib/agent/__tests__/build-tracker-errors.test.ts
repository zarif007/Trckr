import { describe, expect, it } from "vitest";

import { errorMessageFromUnknown } from "../build-tracker-errors";

describe("errorMessageFromUnknown", () => {
  it("returns Error.message", () => {
    expect(errorMessageFromUnknown(new Error("x"))).toBe("x");
  });

  it("returns string as-is", () => {
    expect(errorMessageFromUnknown("y")).toBe("y");
  });
});
