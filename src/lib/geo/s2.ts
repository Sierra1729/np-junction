import { S2LatLng, S2CellId, S2Cell } from "nodes2ts";

export const S2_LEVEL = 13;

/**
 * Converts a latitude/longitude coordinate pair to a Level-13 S2 Cell ID
 * formatted as a 64-bit unsigned decimal integer string (required by Google Agri API).
 */
export function latLngToS2CellIdLevel13(lat: number, lng: number): string {
  const latLng = S2LatLng.fromDegrees(lat, lng);
  const cellId = S2CellId.fromPoint(latLng.toPoint()).parentL(S2_LEVEL);
  return cellId.id.toString();
}

/**
 * Parses an S2CellId from a 64-bit decimal string.
 */
export function parseS2CellId(cellIdStr: string): S2CellId {
  try {
    return new S2CellId(BigInt(cellIdStr));
  } catch {
    // If not valid BigInt, fallback to demo cell
    return new S2CellId(BigInt("4316826463333515264"));
  }
}

/**
 * Returns the 4 edge neighbours for a given level-13 S2 cell ID.
 */
export function getS2EdgeNeighbors(cellIdStr: string): string[] {
  try {
    const cellObj = parseS2CellId(cellIdStr);
    const neighbors = cellObj.getEdgeNeighbors();
    return neighbors.map((n) => n.id.toString());
  } catch {
    return [];
  }
}

/**
 * Returns the approximate lat/lng centroid of a level-13 S2 cell.
 */
export function s2CellIdToCenterLatLng(cellIdStr: string): { latitude: number; longitude: number } {
  try {
    const cellObj = parseS2CellId(cellIdStr);
    const latLng = cellObj.toLatLng();
    return {
      latitude: latLng.latDegrees,
      longitude: latLng.lngDegrees,
    };
  } catch {
    return { latitude: 18.624, longitude: 73.076 };
  }
}

/**
 * Computes bounding box [minLng, minLat, maxLng, maxLat] for an S2 cell.
 */
export function s2CellToBoundingBox(cellIdStr: string): [number, number, number, number] {
  try {
    const cellObj = parseS2CellId(cellIdStr);
    const cell = new S2Cell(cellObj);
    const rect = (cell as any).getRectBound ? (cell as any).getRectBound() : (cell as any).rectBound;
    return [
      rect.lngLo().degrees(),
      rect.latLo().degrees(),
      rect.lngHi().degrees(),
      rect.latHi().degrees(),
    ];
  } catch {
    const center = s2CellIdToCenterLatLng(cellIdStr);
    const delta = 0.005; // ~500m
    return [
      center.longitude - delta,
      center.latitude - delta,
      center.longitude + delta,
      center.latitude + delta,
    ];
  }
}
