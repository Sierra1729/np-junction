import { describe, it, expect } from "vitest";
import { latLngToS2CellIdLevel13, getS2EdgeNeighbors } from "../../src/lib/geo/s2";

describe("S2 level-13 Cell ID generation", () => {
  it("converts lat/lng to valid 64-bit decimal unsigned integer string", () => {
    const lat = 18.624;
    const lng = 73.076;
    const cellId = latLngToS2CellIdLevel13(lat, lng);

    expect(typeof cellId).toBe("string");
    expect(cellId.length).toBeGreaterThan(15);
    // Decimal string containing only digits
    expect(/^\d+$/.test(cellId)).toBe(true);

    // Repeated conversions must be deterministic
    const cellId2 = latLngToS2CellIdLevel13(lat, lng);
    expect(cellId).toBe(cellId2);
  });

  it("nearby coordinates within ~300m map to the same level-13 S2 cell", () => {
    const cell1 = latLngToS2CellIdLevel13(18.624, 73.076);
    const cell2 = latLngToS2CellIdLevel13(18.6245, 73.0765);
    expect(cell1).toBe(cell2);
  });

  it("retrieves 4 distinct edge neighbors for a level-13 cell", () => {
    const cellId = latLngToS2CellIdLevel13(18.624, 73.076);
    const neighbors = getS2EdgeNeighbors(cellId);

    expect(neighbors).toHaveLength(4);
    // All 4 neighbors are unique
    const unique = new Set(neighbors);
    expect(unique.size).toBe(4);
    // None of the neighbors is the cell itself
    expect(unique.has(cellId)).toBe(false);
  });
});
