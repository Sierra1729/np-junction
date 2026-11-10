import {
  AgriFeature,
  AgriFeatureCollection,
  LookupLandscapeResponse,
  MonitorLandscapeResponse,
  MonitoringPrediction,
  LookupLandscapeCaptureDateResponse,
  CaptureDate,
} from "./types";
import { latLngToS2CellIdLevel13 } from "../geo/s2";

export const DEMO_CENTER = {
  latitude: 18.624,
  longitude: 73.076,
};

// S2 level 13 cell containing the demo center
export const DEMO_S2_CELL_ID = latLngToS2CellIdLevel13(
  DEMO_CENTER.latitude,
  DEMO_CENTER.longitude
);

export const DEMO_DATA_VERSION = {
  version: "2026.09.1",
  updateTime: "2026-09-15T04:30:00Z",
};

export const DEMO_CAPTURE_DATES: CaptureDate[] = [
  { year: 2026, month: 9, day: 12 },
  { year: 2026, month: 7, day: 24 },
  { year: 2026, month: 3, day: 10 },
  { year: 2025, month: 11, day: 5 },
  { year: 2025, month: 8, day: 18 },
  { year: 2024, month: 10, day: 22 },
];

/**
 * Generates realistic field polygons arranged in an agricultural landscape
 * around any given latitude and longitude.
 * Adapts crop profiles based on geographic region (North India vs Central/South India).
 */
export function generateDemoFeatures(centerLat: number = 18.624, centerLng: number = 73.076): AgriFeatureCollection {
  const features: AgriFeature[] = [];
  const latStep = 0.0012; // ~130 meters
  const lngStep = 0.0014; // ~140 meters
  const rows = 6;
  const cols = 6;
  const baseLat = centerLat - (rows / 2) * latStep;
  const baseLng = centerLng - (cols / 2) * lngStep;

  const isNorthIndia = centerLat > 28.0;

  const northIndiaTemplates: ((fieldIdx: number) => MonitoringPrediction[])[] = [
    // 0: Basmati Rice - Wheat rotation
    () => [
      {
        season_id: "Kharif 2026",
        start_timestamp_sec: 1781503200, // Jun 15 2026
        end_timestamp_sec: 1792994400, // Oct 25 2026
        crop_1: "Rice",
        conf_1: 0.94,
        crop_2: "Maize",
        conf_2: 0.04,
      },
      {
        season_id: "Rabi 2025",
        start_timestamp_sec: 1761986400,
        end_timestamp_sec: 1774082400,
        crop_1: "Wheat",
        conf_1: 0.91,
        crop_2: "Mustard",
        conf_2: 0.06,
      },
      {
        season_id: "Kharif 2025",
        start_timestamp_sec: 1750408800,
        end_timestamp_sec: 1761899900,
        crop_1: "Rice",
        conf_1: 0.96,
      },
    ],
    // 1: Wheat & Mustard
    () => [
      {
        season_id: "Kharif 2026",
        start_timestamp_sec: 1781503200,
        end_timestamp_sec: 1792994400,
        crop_1: "Rice",
        conf_1: 0.89,
      },
      {
        season_id: "Rabi 2025",
        start_timestamp_sec: 1761986400,
        end_timestamp_sec: 1774082400,
        crop_1: "Mustard",
        conf_1: 0.88,
        crop_2: "Wheat",
        conf_2: 0.08,
      },
    ],
    // 2: Sugarcane
    () => [
      {
        season_id: "Annual 2026",
        start_timestamp_sec: 1768466400,
        end_timestamp_sec: 1800002400,
        crop_1: "Sugarcane",
        conf_1: 0.93,
      },
    ],
    // 3: Fallow / Pulses
    () => [
      {
        season_id: "Kharif 2026",
        start_timestamp_sec: 1781503200,
        end_timestamp_sec: 1792994400,
        crop_1: "Gram",
        conf_1: 0.84,
      },
      {
        season_id: "Rabi 2025",
        start_timestamp_sec: 1761986400,
        end_timestamp_sec: 1774082400,
        crop_1: "Wheat",
        conf_1: 0.87,
      },
    ],
  ];

  const centralIndiaTemplates: ((fieldIdx: number) => MonitoringPrediction[])[] = [
    // 0: Rice - Wheat
    () => [
      {
        season_id: "Kharif 2026",
        start_timestamp_sec: 1781503200,
        end_timestamp_sec: 1792994400,
        crop_1: "Rice",
        conf_1: 0.92,
        crop_2: "Soybeans",
        conf_2: 0.06,
      },
      {
        season_id: "Rabi 2025",
        start_timestamp_sec: 1761986400,
        end_timestamp_sec: 1774082400,
        crop_1: "Wheat",
        conf_1: 0.88,
      },
    ],
    // 1: Cotton & Gram
    () => [
      {
        season_id: "Kharif 2026",
        start_timestamp_sec: 1781503200,
        end_timestamp_sec: 1796191200,
        crop_1: "Cotton",
        conf_1: 0.89,
        crop_2: "Soybeans",
        conf_2: 0.08,
      },
      {
        season_id: "Rabi 2025",
        start_timestamp_sec: 1761986400,
        end_timestamp_sec: 1774082400,
        crop_1: "Gram",
        conf_1: 0.84,
      },
    ],
    // 2: Soybeans & Wheat
    () => [
      {
        season_id: "Kharif 2026",
        start_timestamp_sec: 1781503200,
        end_timestamp_sec: 1791170400,
        crop_1: "Soybeans",
        conf_1: 0.91,
      },
      {
        season_id: "Rabi 2025",
        start_timestamp_sec: 1761986400,
        end_timestamp_sec: 1774082400,
        crop_1: "Wheat",
        conf_1: 0.86,
      },
    ],
    // 3: Sugarcane
    () => [
      {
        season_id: "Annual 2026",
        start_timestamp_sec: 1768466400,
        end_timestamp_sec: 1800002400,
        crop_1: "Sugarcane",
        conf_1: 0.95,
      },
    ],
  ];

  const templates = isNorthIndia ? northIndiaTemplates : centralIndiaTemplates;
  let fieldNumber = 1;
  const latHash = Math.abs(Math.round(centerLat * 1000)) % 1000;
  const lngHash = Math.abs(Math.round(centerLng * 1000)) % 1000;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const fLat = baseLat + row * latStep;
      const fLng = baseLng + col * lngStep;

      // Realistic irregular polygon
      const p1: [number, number] = [fLng + 0.0001, fLat + 0.0001];
      const p2: [number, number] = [fLng + lngStep - 0.00015, fLat + 0.00008];
      const p3: [number, number] = [fLng + lngStep - 0.0001, fLat + latStep - 0.00012];
      const p4: [number, number] = [fLng + 0.00012, fLat + latStep - 0.0001];
      const ring = [p1, p2, p3, p4, p1];

      const areaSqM = Math.round(9500 + ((row * 7 + col * 13 + latHash) % 11) * 1250);
      const plusCode = `8V${latHash}P${col + 1}+${fieldNumber}M`;

      const templateIdx = (fieldNumber - 1) % templates.length;
      const predictions = templates[templateIdx](fieldNumber);
      const confidence = 0.80 + (((fieldNumber * 13 + lngHash) % 18) / 100);

      features.push({
        type: "Feature",
        id: plusCode,
        geometry: {
          type: "MultiPolygon",
          coordinates: [[ring]],
        },
        properties: {
          alu_type: "field",
          area_sq_m: areaSqM,
          class_confidence: Number(confidence.toFixed(2)),
          capture_timestamp_sec: 1789200000,
          monitoring_prediction: predictions,
          plus_code: plusCode,
        },
      });

      fieldNumber++;
    }
  }

  // Add 1 water body and 1 tree clump
  features.push({
    type: "Feature",
    id: `8V${latHash}P_WP`,
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [baseLng + 0.002, baseLat + 0.002],
            [baseLng + 0.003, baseLat + 0.0021],
            [baseLng + 0.0029, baseLat + 0.003],
            [baseLng + 0.0019, baseLat + 0.0029],
            [baseLng + 0.002, baseLat + 0.002],
          ],
        ],
      ],
    },
    properties: {
      alu_type: "farm_pond",
      area_sq_m: 1450,
      class_confidence: 0.94,
    },
  });

  features.push({
    type: "Feature",
    id: `8V${latHash}P_TR`,
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [baseLng + 0.0045, baseLat + 0.0045],
            [baseLng + 0.0055, baseLat + 0.0046],
            [baseLng + 0.0053, baseLat + 0.0054],
            [baseLng + 0.0043, baseLat + 0.0053],
            [baseLng + 0.0045, baseLat + 0.0045],
          ],
        ],
      ],
    },
    properties: {
      alu_type: "trees",
      area_sq_m: 1200,
      class_confidence: 0.88,
    },
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Returns mock LookupLandscapeResponse wrapping stringified GeoJSON
 */
export function getMockLookupResponse(s2CellId: string, centerCoords?: { latitude: number; longitude: number }): LookupLandscapeResponse {
  const fc = centerCoords
    ? generateDemoFeatures(centerCoords.latitude, centerCoords.longitude)
    : generateDemoFeatures();
  return {
    landscape: {
      dataVersion: DEMO_DATA_VERSION,
      geojson: JSON.stringify(fc),
    },
  };
}

/**
 * Returns mock MonitorLandscapeResponse wrapping stringified GeoJSON
 */
export function getMockMonitorResponse(s2CellId: string, centerCoords?: { latitude: number; longitude: number }): MonitorLandscapeResponse {
  const fc = centerCoords
    ? generateDemoFeatures(centerCoords.latitude, centerCoords.longitude)
    : generateDemoFeatures();
  return {
    monitoredLandscape: {
      dataVersion: DEMO_DATA_VERSION,
      geojson: JSON.stringify(fc),
    },
  };
}

/**
 * Returns mock capture dates
 */
export function getMockCaptureDates(): LookupLandscapeCaptureDateResponse {
  return {
    captureDates: DEMO_CAPTURE_DATES,
  };
}
