import { describe, it, expect } from "vitest";
import {
  convertToSqMeters,
  convertFromSqMeters,
  formatAreaWithHectares,
} from "../../src/lib/units";

describe("Land Area Unit Conversions", () => {
  it("converts standard units to square meters correctly", () => {
    // 1 acre = 4046.86 m²
    expect(convertToSqMeters(1, "acre")).toBeCloseTo(4046.86, 2);

    // 1 ha = 10,000 m²
    expect(convertToSqMeters(1, "ha")).toBe(10000);

    // 1 kanal = 505.86 m²
    expect(convertToSqMeters(1, "kanal")).toBeCloseTo(505.86, 2);

    // 1 bigha with default config = 2500 m²
    expect(convertToSqMeters(1, "bigha")).toBe(2500);

    // 1 bigha with custom state config (e.g. 1618.7 m²)
    expect(convertToSqMeters(2, "bigha", { bighaInSqM: 1618.7 })).toBeCloseTo(3237.4, 1);
  });

  it("converts square meters to target units correctly", () => {
    expect(convertFromSqMeters(4046.86, "acre")).toBeCloseTo(1, 4);
    expect(convertFromSqMeters(10000, "ha")).toBe(1);
    expect(convertFromSqMeters(5000, "bigha")).toBe(2);
  });

  it("formats area strings with hectares in parentheses", () => {
    const formatted = formatAreaWithHectares(10000, "acre");
    // 10,000 m² ≈ 2.47 acres (1.00 ha)
    expect(formatted).toContain("2.47 acre");
    expect(formatted).toContain("(1.00 ha)");

    const haFormatted = formatAreaWithHectares(10000, "ha");
    expect(haFormatted).toBe("1.00 ha");
  });
});
