import { describe, it, expect } from "vitest";
import { parseLandscapeGeoJson } from "../../src/lib/agri-api/parser";

describe("parseLandscapeGeoJson", () => {
  it("throws error for empty or invalid strings", () => {
    expect(() => parseLandscapeGeoJson("")).toThrow();
    expect(() => parseLandscapeGeoJson("invalid-json")).toThrow();
    expect(() => parseLandscapeGeoJson("{}")).toThrow();
  });

  it("parses valid GeoJSON string with Polygon features", () => {
    const rawGeoJson = JSON.stringify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "7JF9J3FX+7V",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [73.075, 18.623],
                [73.077, 18.623],
                [73.077, 18.625],
                [73.075, 18.625],
                [73.075, 18.623],
              ],
            ],
          },
          properties: {
            alu_type: "field",
            area_sq_m: 12500,
            class_confidence: 0.92,
            monitoring_prediction: [
              {
                season_id: "Kharif 2026",
                start_timestamp_sec: 1781503200,
                end_timestamp_sec: 1792994400,
                crop_1: "Rice",
                conf_1: 0.89,
                crop_2: "Soybeans",
                conf_2: 0.08,
              },
            ],
          },
        },
      ],
    });

    const parsed = parseLandscapeGeoJson(rawGeoJson);
    expect(parsed.type).toBe("FeatureCollection");
    expect(parsed.features).toHaveLength(1);

    const feat = parsed.features[0];
    expect(feat.id).toBe("7JF9J3FX+7V");
    expect(feat.properties.alu_type).toBe("field");
    expect(feat.properties.area_sq_m).toBe(12500);
    expect(feat.properties.class_confidence).toBe(0.92);
    expect(feat.properties.monitoring_prediction).toHaveLength(1);
    expect(feat.properties.monitoring_prediction![0].crop_1).toBe("Rice");
    expect(feat.properties.monitoring_prediction![0].conf_1).toBe(0.89);
  });

  it("parses MultiPolygon features with special crop predictions", () => {
    const rawGeoJson = JSON.stringify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "7JF9J3UK+01",
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [
                [
                  [73.07, 18.62],
                  [73.08, 18.62],
                  [73.08, 18.63],
                  [73.07, 18.63],
                  [73.07, 18.62],
                ],
              ],
            ],
          },
          properties: {
            alu_type: "field",
            area_sq_m: 8500,
            monitoring_prediction: [
              {
                crop_1: "UNKNOWN_CROP",
                conf_1: 0.75,
              },
            ],
          },
        },
      ],
    });

    const parsed = parseLandscapeGeoJson(rawGeoJson);
    expect(parsed.features[0].properties.monitoring_prediction![0].crop_1).toBe("UNKNOWN_CROP");
  });
});
