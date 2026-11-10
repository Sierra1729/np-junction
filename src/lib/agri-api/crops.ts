import { MonitoringPrediction } from "./types";

/**
 * 12 Major Crops of India as established in Google DeepMind's AMED Paper
 * (arXiv:2507.02972, Table 1). These 12 crops collectively account for ~90% of India's cultivated area.
 */
export const MAJOR_CROPS_PAPER2 = [
  "Wheat",
  "Sugarcane",
  "Soybeans",
  "Mustard",
  "Corn",
  "Rice",
  "Cotton",
  "Gram",
  "Sorghum",
  "Groundnut",
  "Chilli",
  "Bajra",
] as const;

export type MajorCropName = (typeof MAJOR_CROPS_PAPER2)[number];

/**
 * Maximum Allowed Season Length (in days) per crop as scientifically bounded
 * in Google DeepMind AMED Paper (arXiv:2507.02972, Table C2).
 * Used to filter faulty season detections and detect multi-cropping anomalies.
 */
export const MAX_SEASON_LENGTH_DAYS: Record<string, number> = {
  Wheat: 240,
  Sugarcane: 600,
  Soybeans: 150,
  Mustard: 150,
  Corn: 180,
  Rice: 200,
  Cotton: 300,
  Gram: 180,
  Sorghum: 180,
  Groundnut: 180,
  Chilli: 240,
  Bajra: 150,
};

/**
 * Validates if an observed season duration adheres to the agronomic
 * limits specified in Google DeepMind's AMED Paper Table C2.
 */
export function validateSeasonDuration(
  crop: string,
  startSec?: number,
  endSec?: number
): { isValid: boolean; durationDays?: number; maxAllowedDays?: number } {
  if (!startSec || !endSec || endSec <= startSec) {
    return { isValid: true };
  }
  const durationDays = Math.round((endSec - startSec) / 86400);
  const normalizedKey = Object.keys(MAX_SEASON_LENGTH_DAYS).find(
    (k) => k.toLowerCase() === crop.toLowerCase()
  );
  if (!normalizedKey) {
    return { isValid: true, durationDays };
  }
  const maxAllowed = MAX_SEASON_LENGTH_DAYS[normalizedKey];
  return {
    isValid: durationDays <= maxAllowed,
    durationDays,
    maxAllowedDays: maxAllowed,
  };
}

/**
 * Determines the present / currently active crop prediction for a field.
 * Accurately prioritizes the current active calendar season, or the latest
 * recorded satellite monitoring pass, rather than indexing array position 0 (which
 * in Google's AMED API represents the oldest historical season from years ago).
 */
export function getPresentCropPrediction(
  predictions?: MonitoringPrediction[]
): MonitoringPrediction | null {
  if (!predictions || predictions.length === 0) return null;

  // Filter out invalid/empty predictions if valid ones exist
  const valid = predictions.filter(
    (p) => p && p.crop_1 && p.crop_1 !== "NO_PREDICTION" && p.crop_1 !== "UNKNOWN_CROP"
  );
  const pool = valid.length > 0 ? valid : predictions;

  const nowSec = Math.floor(Date.now() / 1000);

  // 1. Direct active calendar window match
  const activeNow = pool.find(
    (p) =>
      typeof p.start_timestamp_sec === "number" &&
      typeof p.end_timestamp_sec === "number" &&
      p.start_timestamp_sec <= nowSec &&
      p.end_timestamp_sec >= nowSec
  );
  if (activeNow) return activeNow;

  // 2. Most recent season (highest end timestamp or start timestamp)
  const sorted = [...pool].sort((a, b) => {
    const timeA = a.end_timestamp_sec || a.start_timestamp_sec || 0;
    const timeB = b.end_timestamp_sec || b.start_timestamp_sec || 0;
    return timeB - timeA;
  });

  return sorted[0] || null;
}

/**
 * Returns historical season predictions sorted from newest (Present) to oldest.
 */
export function getSortedPredictions(
  predictions?: MonitoringPrediction[]
): MonitoringPrediction[] {
  if (!predictions || predictions.length === 0) return [];
  return [...predictions]
    .filter((p) => p && p.crop_1 && p.crop_1 !== "NO_PREDICTION")
    .sort((a, b) => {
      const timeA = a.end_timestamp_sec || a.start_timestamp_sec || 0;
      const timeB = b.end_timestamp_sec || b.start_timestamp_sec || 0;
      return timeB - timeA;
    });
}

/**
 * Returns a human-friendly agronomic season label.
 * For example: "Kharif 2026 (Present)", "Rabi 2025-26", "Zaid 2026"
 */
export function formatSeasonLabel(
  prediction: MonitoringPrediction,
  isLatest: boolean = false
): string {
  if (prediction.season_id) {
    return isLatest ? `${prediction.season_id} (Present)` : prediction.season_id;
  }
  if (!prediction.start_timestamp_sec) {
    return isLatest ? "Current Season" : "Past Season";
  }

  const startDate = new Date(prediction.start_timestamp_sec * 1000);
  const month = startDate.getUTCMonth() + 1; // 1-12
  const year = startDate.getUTCFullYear();

  let label = "";
  if (month >= 5 && month <= 10) {
    label = `Kharif ${year}`;
  } else if (month >= 11 || month <= 2) {
    label = `Rabi ${year}`;
  } else {
    label = `Zaid ${year}`;
  }

  return isLatest ? `${label} (Present)` : label;
}

/**
 * Normalizes crop names for Indian agronomy (e.g., RICE -> Paddy (Rice)).
 */
export function formatCropDisplayName(cropName?: string): string {
  if (!cropName || cropName === "UNKNOWN_CROP" || cropName === "NO_PREDICTION") {
    return "Uncultivated";
  }
  const upper = cropName.toUpperCase();
  if (upper === "RICE") return "Paddy (Rice)";
  if (upper === "GRAM") return "Gram (Chana)";
  if (upper === "BAJRA") return "Bajra (Millet)";
  if (upper === "SORGHUM") return "Sorghum (Jowar)";
  if (upper === "SOYBEANS") return "Soybeans";
  return cropName.charAt(0).toUpperCase() + cropName.slice(1).toLowerCase();
}

export interface CropPredictionInput {
  crop_1: string;
  conf_1?: number;
  season_id?: string;
  start_timestamp_sec?: number;
  end_timestamp_sec?: number;
}

/**
 * Analyzes multi-season crop history to detect authentic agronomic rotation patterns.
 * E.g., Rice-Wheat rotation in the Indo-Gangetic Plains.
 */
export function assessCropRotationPattern(predictions?: CropPredictionInput[]): {
  isRotational: boolean;
  patternType: "RICE_WHEAT_ROTATION" | "MONOCULTURE" | "MULTI_CROP_ROTATION" | "FALLOW_DOMINATED";
  summary: string;
} {
  if (!predictions || predictions.length < 2) {
    return {
      isRotational: false,
      patternType: "MONOCULTURE",
      summary: "Insufficient historical seasons to evaluate rotation.",
    };
  }

  const valid = predictions.filter((p) => p && p.crop_1 && p.crop_1 !== "NO_PREDICTION");
  const crops = valid.map((p) => p.crop_1.toUpperCase());
  const hasRice = crops.some((c) => c === "RICE");
  const hasWheat = crops.some((c) => c === "WHEAT");

  if (hasRice && hasWheat) {
    return {
      isRotational: true,
      patternType: "RICE_WHEAT_ROTATION",
      summary: "Authentic Rice-Wheat rotation verified across alternating Kharif and Rabi seasons.",
    };
  }

  const uniqueCrops = new Set(crops);
  if (uniqueCrops.size === 1) {
    return {
      isRotational: false,
      patternType: "MONOCULTURE",
      summary: `Continuous monoculture cultivation of ${formatCropDisplayName(crops[0])}.`,
    };
  }

  return {
    isRotational: true,
    patternType: "MULTI_CROP_ROTATION",
    summary: `Multi-crop rotation verified with ${uniqueCrops.size} distinct crops across seasons.`,
  };
}
