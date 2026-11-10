import { describe, it, expect } from "vitest";
import { parseCoordinateString } from "../../src/lib/geo/coordinates";
import { generateDemoFeatures } from "../../src/lib/agri-api/mock";
import { findMatchingField } from "../../src/lib/geo/turf-utils";

describe("parseCoordinateString", () => {
  it("parses compact DMS with cardinal letters (e.g. 323729.87 n and 744508.50 e)", () => {
    const res = parseCoordinateString("323729.87 n and 744508.50 e");
    expect(res).not.toBeNull();
    expect(res?.lat).toBeCloseTo(32.62496, 4);
    expect(res?.lng).toBeCloseTo(74.75236, 4);
  });

  it("parses formatted DMS notation (e.g. 32° 37' 29.87\" N, 74° 45' 08.50\" E)", () => {
    const res = parseCoordinateString("32° 37' 29.87\" N, 74° 45' 08.50\" E");
    expect(res).not.toBeNull();
    expect(res?.lat).toBeCloseTo(32.62496, 4);
    expect(res?.lng).toBeCloseTo(74.75236, 4);
  });

  it("parses spaced DMS (e.g. 32 37 29.87 N 74 45 08.50 E)", () => {
    const res = parseCoordinateString("32 37 29.87 N 74 45 08.50 E");
    expect(res).not.toBeNull();
    expect(res?.lat).toBeCloseTo(32.62496, 4);
    expect(res?.lng).toBeCloseTo(74.75236, 4);
  });

  it("handles South and West coordinates", () => {
    const res = parseCoordinateString("12 30 00 S, 45 15 00 W");
    expect(res).not.toBeNull();
    expect(res?.lat).toBeCloseTo(-12.5, 4);
    expect(res?.lng).toBeCloseTo(-45.25, 4);
  });

  it("parses standard decimal degree coordinates", () => {
    const res = parseCoordinateString("32.624964, 74.752361");
    expect(res).not.toBeNull();
    expect(res?.lat).toBeCloseTo(32.624964, 5);
    expect(res?.lng).toBeCloseTo(74.752361, 5);
  });

  it("returns null for non-coordinate text", () => {
    expect(parseCoordinateString("random location")).toBeNull();
    expect(parseCoordinateString("")).toBeNull();
  });
});

describe("generateDemoFeatures (Cadastre Grid System Generation)", () => {
  it("creates a full agricultural grid system of contiguous parcels centered at coordinates", () => {
    const lat = 32.620; // e.g. Sunder farms
    const lng = 74.735;
    const grid = generateDemoFeatures(lat, lng);

    expect(grid).toBeDefined();
    expect(grid.type).toBe("FeatureCollection");
    expect(grid.features.length).toBeGreaterThanOrEqual(36);

    const fields = grid.features.filter((f) => f.properties.alu_type === "field");
    expect(fields.length).toBe(36);
    expect(fields[0].properties.area_sq_m).toBeGreaterThan(1500);
    expect(fields[0].properties.monitoring_prediction).toBeDefined();
    expect(fields[0].properties.monitoring_prediction?.length).toBeGreaterThan(0);

    const matched = findMatchingField([lng, lat], grid.features, 100);
    expect(matched).toBeDefined();
  });

  it("generates deterministic and unique IDs for different regions", () => {
    const g1 = generateDemoFeatures(32.620, 74.735);
    const g2 = generateDemoFeatures(32.618, 74.765);
    expect(g1.features[0].id).not.toBe(g2.features[0].id);
  });
});
