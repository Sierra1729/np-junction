import { describe, it, expect } from "vitest";
import { parseCoordinateString } from "../../src/lib/geo/coordinates";
import { createParcelForPoint, isPointInPolygon } from "../../src/lib/geo/turf-utils";

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

describe("createParcelForPoint (Dynamic Land Boundary Detection)", () => {
  it("creates a valid parcel polygon that strictly encloses the clicked coordinate", () => {
    const lat = 32.620; // e.g. Sunder farms
    const lng = 74.735;
    const parcel = createParcelForPoint(lat, lng);

    expect(parcel).toBeDefined();
    expect(parcel.properties.alu_type).toBe("field");
    expect(parcel.properties.area_sq_m).toBeGreaterThan(1500); // > 0.37 acre
    expect(parcel.properties.area_sq_m).toBeLessThan(12000); // < 3.0 acres
    expect(parcel.properties.monitoring_prediction).toBeDefined();
    expect(parcel.properties.monitoring_prediction?.length).toBeGreaterThan(0);

    // Verify point is inside the generated polygon
    const isInside = isPointInPolygon([lng, lat], parcel.geometry);
    expect(isInside).toBe(true);
  });

  it("generates deterministic and unique IDs for different coordinates", () => {
    const p1 = createParcelForPoint(32.620, 74.735);
    const p2 = createParcelForPoint(32.618, 74.765);
    expect(p1.id).not.toBe(p2.id);
  });
});
