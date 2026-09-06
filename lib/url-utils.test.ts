import { describe, expect, it } from "vitest";
import { normalizeExternalUrl } from "./url-utils";

describe("normalizeExternalUrl", () => {
  it("returns undefined for empty input", () => {
    expect(normalizeExternalUrl(null)).toBeUndefined();
    expect(normalizeExternalUrl(undefined)).toBeUndefined();
    expect(normalizeExternalUrl("")).toBeUndefined();
    expect(normalizeExternalUrl("   ")).toBeUndefined();
  });

  it("leaves URLs with a protocol untouched", () => {
    expect(normalizeExternalUrl("https://example.com")).toBe("https://example.com");
    expect(normalizeExternalUrl("http://example.com")).toBe("http://example.com");
  });

  it("adds https:// to bare domains", () => {
    expect(normalizeExternalUrl("example.com")).toBe("https://example.com");
  });

  it("trims whitespace", () => {
    expect(normalizeExternalUrl("  example.com  ")).toBe("https://example.com");
  });
});
