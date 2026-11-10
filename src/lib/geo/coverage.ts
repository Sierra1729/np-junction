import * as turf from "@turf/turf";
import { GeoJsonGeometry } from "../agri-api/types";
import { latLngToS2CellIdLevel13, getS2EdgeNeighbors } from "./s2";

/**
 * Samples a drawn polygon on a ~300m grid to find covering level-13 S2 cells.
 * Deduplicates and includes edge neighbors for border coverage.
 */
export function getS2CellsCoveringPolygon(geometry: GeoJsonGeometry): string[] {
  try {
    const poly = turf.feature(geometry as any);
    const bbox = turf.bbox(poly); // [minX, minY, maxX, maxY]

    const [minLng, minLat, maxLng, maxLat] = bbox;

    // ~300 meters step in degrees: 1 deg lat ≈ 111,000m => 300m ≈ 0.0027 deg
    // at lat 18 deg: 1 deg lng ≈ 111,000 * cos(18°) ≈ 105,500m => 300m ≈ 0.0028 deg
    const latStep = 0.0027;
    const lngStep = 0.0028;

    const cellSet = new Set<string>();
    const edgeNeighborCandidates: string[] = [];

    let count = 0;
    const maxSamples = 500; // Safeguard

    for (let lat = minLat; lat <= maxLat && count < maxSamples; lat += latStep) {
      for (let lng = minLng; lng <= maxLng && count < maxSamples; lng += lngStep) {
        count++;
        const pt = turf.point([lng, lat]);
        // Only sample points that lie inside or very close to the polygon
        if (turf.booleanPointInPolygon(pt, poly)) {
          const cellId = latLngToS2CellIdLevel13(lat, lng);
          cellSet.add(cellId);
          edgeNeighborCandidates.push(cellId);
        }
      }
    }

    // If bbox is small and no grid points were inside (e.g. tiny polygon), use centroid
    if (cellSet.size === 0) {
      const center = turf.centroid(poly);
      const [cLng, cLat] = center.geometry.coordinates;
      const centerCellId = latLngToS2CellIdLevel13(cLat, cLng);
      cellSet.add(centerCellId);
      edgeNeighborCandidates.push(centerCellId);
    }

    // Add immediate edge neighbors to handle field features spanning cell borders
    for (const cellId of edgeNeighborCandidates.slice(0, 10)) {
      const neighbors = getS2EdgeNeighbors(cellId);
      for (const n of neighbors) {
        cellSet.add(n);
      }
    }

    return Array.from(cellSet);
  } catch {
    return [];
  }
}
