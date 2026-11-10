/**
 * Google Agricultural Understanding API (ALU & AMED)
 * Official TypeScript Interface definitions based on official specifications.
 */

export type AluType = "field" | "farm_pond" | "other_water" | "dug_well" | "trees";

export const SUPPORTED_CROPS = [
  "Bajra",
  "Chilli",
  "Corn",
  "Cotton",
  "Gram",
  "Groundnut",
  "Mustard",
  "Rice",
  "Sorghum",
  "Soybeans",
  "Sugarcane",
  "Wheat",
] as const;

export type SupportedCrop = (typeof SUPPORTED_CROPS)[number];
export type SpecialCrop = "UNKNOWN_CROP" | "NO_PREDICTION";

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface LocationSpecifier {
  coordinates?: LatLng;
  s2CellId?: string; // 64-bit decimal unsigned integer string (level 13)
}

export interface CaptureDate {
  year: number;
  month: number;
  day: number;
}

export interface DataVersion {
  version: string;
  updateTime?: string; // ISO 8601 string, e.g. "2026-09-15T00:00:00Z"
}

export interface LookupLandscapeRequest {
  locationSpecifier: LocationSpecifier;
  captureDate?: CaptureDate;
  dataVersion?: { version: string };
  includeNonAgriculturalAreas?: boolean;
}

export interface MonitorLandscapeRequest {
  locationSpecifier: LocationSpecifier;
  dataVersion?: { version: string };
}

export interface MonitoringPrediction {
  season_id?: string;
  start_timestamp_sec: number; // Sowing timestamp (Unix seconds)
  end_timestamp_sec: number; // Harvest timestamp (Unix seconds)
  crop_1: string;
  conf_1: number;
  crop_2?: string;
  conf_2?: number;
  crop_3?: string;
  conf_3?: number;
}

export interface AluFeatureProperties {
  alu_type: AluType;
  area_sq_m: number;
  class_confidence: number; // 0 to 1
  capture_timestamp_sec?: number;
  // Included in monitorLandscape field features:
  monitoring_prediction?: MonitoringPrediction[];
  // Additional metadata
  plus_code?: string;
  farmer_id?: string;
  farmer_name?: string;
}

export interface GeoJsonGeometry {
  type: "Point" | "Polygon" | "MultiPolygon";
  coordinates: any;
}

export interface AgriFeature {
  type: "Feature";
  id: string; // Plus Code of centroid
  geometry: GeoJsonGeometry;
  properties: AluFeatureProperties;
}

export interface AgriFeatureCollection {
  type: "FeatureCollection";
  features: AgriFeature[];
}

/**
 * Raw response from POST /v1:lookupLandscape
 */
export interface LookupLandscapeResponse {
  landscape: {
    dataVersion: DataVersion;
    geojson: string; // Stringified GeoJSON FeatureCollection
  };
}

/**
 * Raw response from POST /v1:monitorLandscape
 */
export interface MonitorLandscapeResponse {
  monitoredLandscape: {
    dataVersion: DataVersion;
    geojson: string; // Stringified GeoJSON FeatureCollection
  };
}

/**
 * Response from POST /v1:lookupLandscapeCaptureDate
 */
export interface LookupLandscapeCaptureDateResponse {
  captureDates: CaptureDate[];
}

/**
 * Parsed payload returned to the frontend
 */
export interface ParsedLandscapeResult {
  endpoint: "lookup" | "monitor";
  s2CellId: string;
  dataVersion: DataVersion;
  featureCollection: AgriFeatureCollection;
  isMock: boolean;
  cached: boolean;
  fetchedAt: string;
}
