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
 * Shifts a real parcel FeatureCollection so its centroid lands on (targetLat, targetLng).
 * Used to show authentic ALU-shaped boundaries (from the real Kotli dataset) anywhere on
 * the map when the Google API has no coverage for that S2 cell.
 * Every polygon vertex is offset by the same delta-lat / delta-lng — shapes and relative
 * positions are preserved exactly, so borders remain crisp and non-overlapping.
 */
export function shiftParcelCluster(
  source: AgriFeatureCollection,
  targetLat: number,
  targetLng: number
): AgriFeatureCollection {
  const fields = source.features.filter((f) => f.properties.alu_type === "field");
  if (fields.length === 0) return source;

  // Compute average centroid of source parcels
  let sumLat = 0;
  let sumLng = 0;
  for (const f of fields) {
    try {
      const c = turf.centroid(turf.feature(f.geometry as any));
      sumLng += c.geometry.coordinates[0];
      sumLat += c.geometry.coordinates[1];
    } catch { /* skip bad geometry */ }
  }
  const srcLat = sumLat / fields.length;
  const srcLng = sumLng / fields.length;

  const dLat = targetLat - srcLat;
  const dLng = targetLng - srcLng;

  const latHash = Math.abs(Math.round(targetLat * 1000)) % 1000;
  const lngHash = Math.abs(Math.round(targetLng * 1000)) % 1000;

  const shiftRing = (ring: number[][]): number[][] =>
    ring.map(([lng, lat]) => [lng + dLng, lat + dLat]);

  const shiftGeometry = (geom: GeoJsonGeometry): GeoJsonGeometry => {
    if (geom.type === "Polygon") {
      return { ...geom, coordinates: (geom.coordinates as number[][][]).map(shiftRing) };
    }
    if (geom.type === "MultiPolygon") {
      return {
        ...geom,
        coordinates: (geom.coordinates as number[][][][]).map((poly) =>
          poly.map(shiftRing)
        ),
      };
    }
    return geom;
  };

  const shifted = source.features.map((f, i) => {
    const subCode = (i + 10).toString().padStart(3, "0");
    const newId = `8J${latHash.toString().padStart(3, "0")}${lngHash.toString().padStart(3, "0")}+${subCode}`;
    return {
      ...f,
      id: newId,
      geometry: shiftGeometry(f.geometry),
      properties: {
        ...f.properties,
        plus_code: newId,
      },
    };
  });

  return { type: "FeatureCollection", features: shifted };
}
