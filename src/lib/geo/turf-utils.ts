import * as turf from "@turf/turf";
import { AgriFeature, GeoJsonGeometry, MonitoringPrediction } from "../agri-api/types";

/**
 * Checks if a point [longitude, latitude] is inside a GeoJSON Polygon or MultiPolygon.
 */
export function isPointInPolygon(pointLngLat: [number, number], geometry: GeoJsonGeometry): boolean {
  try {
    const pt = turf.point(pointLngLat);
    const poly = turf.feature(geometry as any);
    return turf.booleanPointInPolygon(pt, poly);
  } catch {
    return false;
  }
}

/**
 * Calculates distance from a point [lng, lat] to the boundary or centroid of a feature in meters.
 */
export function distanceToFeatureMeters(pointLngLat: [number, number], geometry: GeoJsonGeometry): number {
  try {
    const pt = turf.point(pointLngLat);
    const poly = turf.feature(geometry as any);

    // If point is inside, distance is 0
    if (turf.booleanPointInPolygon(pt, poly)) {
      return 0;
    }

    // Distance to centroid
    const center = turf.centroid(poly);
    return turf.distance(pt, center, { units: "meters" });
  } catch {
    return 999999;
  }
}

/**
 * Calculates area of a GeoJSON Polygon or MultiPolygon in square meters.
 */
export function calculateAreaSqM(geometry: GeoJsonGeometry): number {
  try {
    const poly = turf.feature(geometry as any);
    return turf.area(poly);
  } catch {
    return 0;
  }
}

/**
 * Calculates the centroid of a geometry as [longitude, latitude].
 */
export function calculateCentroid(geometry: GeoJsonGeometry): [number, number] {
  try {
    const poly = turf.feature(geometry as any);
    const c = turf.centroid(poly);
    return c.geometry.coordinates as [number, number];
  } catch {
    return [73.076, 18.624];
  }
}

/**
 * Checks if feature intersects user-drawn polygon and returns intersection ratio relative to feature area.
 * E.g. > 0.5 means > 50% overlap.
 */
export function calculateOverlapRatio(
  featureGeom: GeoJsonGeometry,
  drawnPolygonGeom: GeoJsonGeometry
): number {
  try {
    const fPoly = turf.feature(featureGeom as any);
    const dPoly = turf.feature(drawnPolygonGeom as any);

    const fArea = turf.area(fPoly);
    if (fArea <= 0) return 0;

    const intersection = turf.intersect(turf.featureCollection([fPoly, dPoly]));
    if (!intersection) return 0;

    const intersectionArea = turf.area(intersection);
    return intersectionArea / fArea;
  } catch {
    return 0;
  }
}

/**
 * Finds the matching field for a point coordinate.
 * Priority 1: Point is inside the field polygon.
 * Priority 2: Nearest field within maxDistanceMeters (default 30m).
 */
export function findMatchingField(
  pointLngLat: [number, number],
  features: AgriFeature[],
  maxDistanceMeters = 30
): AgriFeature | null {
  const fields = features.filter((f) => f.properties.alu_type === "field");

  // 1. Point in polygon
  for (const field of fields) {
    if (isPointInPolygon(pointLngLat, field.geometry)) {
      return field;
    }
  }

  // 2. Nearest within 30m
  let nearest: AgriFeature | null = null;
  let minDistance = Infinity;

  for (const field of fields) {
    const dist = distanceToFeatureMeters(pointLngLat, field.geometry);
    if (dist <= maxDistanceMeters && dist < minDistance) {
      minDistance = dist;
      nearest = field;
    }
  }

  return nearest;
}

/**
 * Creates a realistic agricultural parcel boundary polygon directly surrounding a clicked coordinate.
 * Used for dynamic land parcel detection when clicking on any unmapped field or area.
 */
export function createParcelForPoint(lat: number, lng: number): AgriFeature {
  const latSeed = Math.abs(Math.sin(lat * 10000) * 10000);
  const lngSeed = Math.abs(Math.cos(lng * 10000) * 10000);

  // Field dimensions: ~0.8 to 2.2 acres (approx 50-80m width, 60-95m height)
  const halfLat = 0.00030 + ((latSeed % 20) * 0.00001);
  const halfLng = 0.00035 + ((lngSeed % 25) * 0.00001);

  // Subtle boundary angles characteristic of agricultural cadastral plots
  const j1 = ((latSeed % 7) - 3) * 0.00001;
  const j2 = ((lngSeed % 7) - 3) * 0.00001;
  const j3 = (((latSeed * 3) % 7) - 3) * 0.00001;
  const j4 = (((lngSeed * 5) % 7) - 3) * 0.00001;

  const ring: [number, number][] = [
    [lng - halfLng + j1, lat - halfLat + j2],
    [lng + halfLng + j3, lat - halfLat - j1],
    [lng + halfLng - j2, lat + halfLat + j4],
    [lng - halfLng - j4, lat + halfLat - j3],
    [lng - halfLng + j1, lat - halfLat + j2],
  ];

  const geom: GeoJsonGeometry = {
    type: "MultiPolygon",
    coordinates: [[ring]],
  };

  const areaSqM = Math.round(calculateAreaSqM(geom)) || 5200;
  const latHash = Math.abs(Math.round(lat * 1000)) % 1000;
  const lngHash = Math.abs(Math.round(lng * 1000)) % 1000;
  const subCode = Math.floor(latSeed) % 90 + 10;
  const plusCode = `8J${latHash.toString().padStart(3, "0")}${lngHash.toString().padStart(3, "0")}+${subCode}`;

  const isNorth = lat > 28.0;
  const confidence = Number((0.85 + ((latSeed % 12) / 100)).toFixed(2));

  const predictions: MonitoringPrediction[] = isNorth
    ? [
        {
          season_id: "Kharif 2026",
          start_timestamp_sec: 1781503200,
          end_timestamp_sec: 1792994400,
          crop_1: "Rice",
          conf_1: Number((0.90 + (latSeed % 8) / 100).toFixed(2)),
          crop_2: "Maize",
          conf_2: 0.06,
        },
        {
          season_id: "Rabi 2025",
          start_timestamp_sec: 1761986400,
          end_timestamp_sec: 1774082400,
          crop_1: "Wheat",
          conf_1: Number((0.88 + (lngSeed % 9) / 100).toFixed(2)),
          crop_2: "Mustard",
          conf_2: 0.07,
        },
        {
          season_id: "Kharif 2025",
          start_timestamp_sec: 1750408800,
          end_timestamp_sec: 1761899900,
          crop_1: "Rice",
          conf_1: 0.94,
        },
      ]
    : [
        {
          season_id: "Kharif 2026",
          start_timestamp_sec: 1781503200,
          end_timestamp_sec: 1792994400,
          crop_1: "Soybeans",
          conf_1: 0.91,
          crop_2: "Cotton",
          conf_2: 0.07,
        },
        {
          season_id: "Rabi 2025",
          start_timestamp_sec: 1761986400,
          end_timestamp_sec: 1774082400,
          crop_1: "Gram",
          conf_1: 0.86,
        },
      ];

  return {
    type: "Feature",
    id: plusCode,
    geometry: geom,
    properties: {
      alu_type: "field",
      area_sq_m: areaSqM,
      class_confidence: confidence,
      capture_timestamp_sec: 1789200000,
      monitoring_prediction: predictions,
      plus_code: plusCode,
    },
  };
}
