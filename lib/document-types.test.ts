import { describe, expect, it } from "vitest";
import { documentTypeLabel } from "./document-types";

describe("documentTypeLabel", () => {
  it("returns the German label for a known value", () => {
    expect(documentTypeLabel("Uebung")).toBe("Übung");
    expect(documentTypeLabel("Skript")).toBe("Skript");
  });

  it("falls back to the raw value for unknown types", () => {
    expect(documentTypeLabel("Sonstiges")).toBe("Sonstiges");
  });
});
