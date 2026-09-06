import { describe, expect, it } from "vitest";
import { toDateKey, isoWeekday } from "./date-utils";

describe("toDateKey", () => {
  it("formats a date as YYYY-MM-DD using local values", () => {
    expect(toDateKey(new Date(2026, 8, 5))).toBe("2026-09-05");
  });

  it("pads single-digit months and days", () => {
    expect(toDateKey(new Date(2026, 0, 3))).toBe("2026-01-03");
  });
});

describe("isoWeekday", () => {
  it("maps Monday to 0", () => {
    // 2026-09-07 is a Monday
    expect(isoWeekday(new Date(2026, 8, 7))).toBe(0);
  });

  it("maps Sunday to 6", () => {
    // 2026-09-06 is a Sunday
    expect(isoWeekday(new Date(2026, 8, 6))).toBe(6);
  });
});
