import * as turf from "@turf/turf";
import { AgriFeature, GeoJsonGeometry } from "../agri-api/types";

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

