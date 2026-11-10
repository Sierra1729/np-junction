import {
  AgriFeature,
  AgriFeatureCollection,
  AluFeatureProperties,
  GeoJsonGeometry,
} from "./types";

/**
 * Safely parses the stringified GeoJSON returned by Google Agricultural Understanding API.
 * Validates features, normalizes geometries, and ensures standard properties.
 */
export function parseLandscapeGeoJson(rawGeoJsonString: string): AgriFeatureCollection {
  if (!rawGeoJsonString || typeof rawGeoJsonString !== "string") {
    throw new Error("Invalid GeoJSON payload: expected non-empty JSON string");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawGeoJsonString);
  } catch (err) {
    throw new Error(`Failed to parse GeoJSON string: ${(err as Error).message}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Parsed GeoJSON is not an object");
  }

  const fc = parsed as { type?: string; features?: unknown[] };
  if (fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
    throw new Error("Invalid GeoJSON: Root object must be a FeatureCollection with features array");
  }

  const validatedFeatures: AgriFeature[] = [];

  for (let i = 0; i < fc.features.length; i++) {
    const rawFeature = fc.features[i] as {
      type?: string;
      id?: string;
      geometry?: { type?: string; coordinates?: unknown };
      properties?: Record<string, unknown>;
    };

    if (!rawFeature || rawFeature.type !== "Feature" || !rawFeature.geometry) {
      continue;
    }

    const geomType = rawFeature.geometry.type;
    if (geomType !== "Polygon" && geomType !== "MultiPolygon") {
      continue;
    }

    const geometry = rawFeature.geometry as GeoJsonGeometry;
    const rawProps = rawFeature.properties || {};

    const properties: AluFeatureProperties = {
      alu_type: (rawProps.alu_type as AluFeatureProperties["alu_type"]) || "field",
      area_sq_m: typeof rawProps.area_sq_m === "number" ? rawProps.area_sq_m : 0,
      class_confidence:
        typeof rawProps.class_confidence === "number" ? rawProps.class_confidence : 0.85,
      capture_timestamp_sec:
        typeof rawProps.capture_timestamp_sec === "number"
          ? rawProps.capture_timestamp_sec
          : undefined,
      monitoring_prediction: Array.isArray(rawProps.monitoring_prediction)
        ? (rawProps.monitoring_prediction as AluFeatureProperties["monitoring_prediction"])
        : undefined,
      plus_code: typeof rawProps.plus_code === "string" ? rawProps.plus_code : undefined,
      farmer_id: typeof rawProps.farmer_id === "string" ? rawProps.farmer_id : undefined,
      farmer_name: typeof rawProps.farmer_name === "string" ? rawProps.farmer_name : undefined,
    };

    // Use feature ID or fallback to Plus Code in properties or synthetic ID
    const featureId = rawFeature.id || properties.plus_code || `FIELD_${i + 1}`;

    validatedFeatures.push({
      type: "Feature",
      id: featureId,
      geometry,
      properties,
    });
  }

  return {
    type: "FeatureCollection",
    features: validatedFeatures,
  };
}
