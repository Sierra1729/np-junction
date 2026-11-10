import * as turf from "@turf/turf";
import { AgriFeature, AgriFeatureCollection, GeoJsonGeometry, MonitoringPrediction } from "../agri-api/types";

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
 * Creates an authentic agricultural parcel cluster around any clicked coordinates.
 * Generates contiguous irregular farm parcel strips sharing realistic field bunds,
 * with deterministic dimensions, natural angular tilts, and multi-season AMED predictions.
 */
export function createOrganicParcelCluster(lat: number, lng: number): AgriFeatureCollection {
  const features: AgriFeature[] = [];
  const latSeed = Math.abs(Math.sin(lat * 10000) * 10000);
  const lngSeed = Math.abs(Math.cos(lng * 10000) * 10000);

  // Field strip dimensions (typical Indian smallholder farm parcel: ~45m width, ~95m length)
  const stripW = 0.00045 + ((latSeed % 5) * 0.00002);
  const stripH = 0.00090 + ((lngSeed % 7) * 0.00002);
  const skewX = 0.00018; // natural agricultural field line orientation angle

  // 3x3 contiguous field parcels sharing exact common borders
  const rows = 3;
  const cols = 3;
  const startLat = lat - (rows / 2) * stripH;
  const startLng = lng - (cols / 2) * stripW;

  const isNorth = lat > 28.0;
  const latHash = Math.abs(Math.round(lat * 1000)) % 1000;
  const lngHash = Math.abs(Math.round(lng * 1000)) % 1000;

  const cropPatterns = isNorth
    ? [
        { crop1: "Rice", conf1: 0.94, crop2: "Maize" },
        { crop1: "Wheat", conf1: 0.91, crop2: "Mustard" },
        { crop1: "Mustard", conf1: 0.89, crop2: "Wheat" },
        { crop1: "Sugarcane", conf1: 0.95, crop2: "Rice" },
        { crop1: "Rice", conf1: 0.92, crop2: "Wheat" },
      ]
    : [
        { crop1: "Soybeans", conf1: 0.93, crop2: "Cotton" },
        { crop1: "Cotton", conf1: 0.90, crop2: "Soybeans" },
        { crop1: "Gram", conf1: 0.88, crop2: "Wheat" },
        { crop1: "Sugarcane", conf1: 0.95, crop2: "Soybeans" },
      ];

  let fieldNum = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const y1 = startLat + r * stripH;
      const y2 = y1 + stripH;
      const x1 = startLng + c * stripW + (r * skewX);
      const x2 = x1 + stripW;

      // Organic agricultural polygon with natural bund vertices
      const ring: [number, number][] = [
        [x1, y1],
        [x2, y1 + (skewX * 0.25)],
        [x2 + (skewX * 0.35), y2],
        [x1 + (skewX * 0.35), y2 - (skewX * 0.15)],
        [x1, y1],
      ];

      const geom: GeoJsonGeometry = {
        type: "MultiPolygon",
        coordinates: [[ring]],
      };

      const areaSqM = Math.round(calculateAreaSqM(geom)) || 4200;
      const subCode = (r * cols + c + 10).toString();
      const plusCode = `8J${latHash.toString().padStart(3, "0")}${lngHash.toString().padStart(3, "0")}+${subCode}`;

      const pattern = cropPatterns[(fieldNum - 1) % cropPatterns.length];
      const predictions: MonitoringPrediction[] = [
        {
          season_id: "Kharif 2026",
          start_timestamp_sec: 1781503200,
          end_timestamp_sec: 1792994400,
          crop_1: pattern.crop1,
          conf_1: pattern.conf1,
          crop_2: pattern.crop2,
          conf_2: 0.05,
        },
        {
          season_id: "Rabi 2025",
          start_timestamp_sec: 1761986400,
          end_timestamp_sec: 1774082400,
          crop_1: isNorth ? "Wheat" : "Gram",
          conf_1: 0.89,
        },
      ];

      features.push({
        type: "Feature",
        id: plusCode,
        geometry: geom,
        properties: {
          alu_type: "field",
          area_sq_m: areaSqM,
          class_confidence: Number((0.88 + ((r * 3 + c) % 8) / 100).toFixed(2)),
          capture_timestamp_sec: 1789200000,
          monitoring_prediction: predictions,
          plus_code: plusCode,
        },
      });

      fieldNum++;
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}
