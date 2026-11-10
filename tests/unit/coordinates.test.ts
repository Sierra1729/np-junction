import { describe, it, expect } from "vitest";
import { parseCoordinateString } from "../../src/lib/geo/coordinates";

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
