import { MonitoringPrediction, SUPPORTED_CROPS } from "../agri-api/types";

export type AreaCheckStatus = "MATCH" | "PARTIAL" | "MISMATCH";
export type CropCheckStatus =
  | "STRONG_MATCH"
  | "PROBABLE_MATCH"
  | "MISMATCH"
  | "NOT_VERIFIABLE"
  | "NO_CULTIVATION_DETECTED";

export type OverallStatus = "VERIFIED" | "NEEDS_VISIT" | "MISMATCH";

export interface ScoringThresholds {
  areaMatchPct: number; // default 10%
  areaPartialPct: number; // default 25%
  cropStrongConf: number; // default 0.7
  cropProbableConf: number; // default 0.5
  historyConsistencyMin: number; // default 60
  boundaryHighConf: number; // default 0.9
  boundaryMedConf: number; // default 0.75
  historyYears: number; // default 3
}

export const DEFAULT_THRESHOLDS: ScoringThresholds = {
  areaMatchPct: 10,
  areaPartialPct: 25,
  cropStrongConf: 0.7,
  cropProbableConf: 0.5,
  historyConsistencyMin: 60,
  boundaryHighConf: 0.9,
  boundaryMedConf: 0.75,
  historyYears: 3,
};

export interface AreaScoreResult {
  status: AreaCheckStatus;
  claimedAreaSqM: number;
  measuredAreaSqM: number;
  deviationPct: number;
  explanation: string;
}

export interface CropScoreResult {
  status: CropCheckStatus;
  claimedCrop: string;
  detectedCrop1?: string;
  conf1?: number;
  detectedCrop2?: string;
  conf2?: number;
  explanation: string;
}

export interface HistoryScoreResult {
  score: number; // 0 - 100
  totalSeasons: number;
  cultivatedSeasons: number;
  seasonsSummary: { seasonLabel: string; crop: string; conf: number }[];
  explanation: string;
  hasLongFallow: boolean;
}

export interface BoundaryScoreResult {
  confidence: number;
  tier: "HIGH" | "MEDIUM" | "LOW";
  needsOnsiteVerification: boolean;
  explanation: string;
}

export interface VerificationScores {
  overallStatus: OverallStatus;
  overallScore: number;
  area: AreaScoreResult;
  crop: CropScoreResult;
  history: HistoryScoreResult;
  boundary: BoundaryScoreResult;
  reasons: string[];
}

/**
 * 1. Area check
 */
export function scoreArea(
  claimedAreaSqM: number,
  measuredAreaSqM: number,
  thresholds: ScoringThresholds = DEFAULT_THRESHOLDS
): AreaScoreResult {
  if (claimedAreaSqM <= 0) {
    return {
      status: "MISMATCH",
      claimedAreaSqM,
      measuredAreaSqM,
      deviationPct: 100,
      explanation: "Claimed area must be greater than zero.",
    };
  }

  const deviationPct =
    (Math.abs(measuredAreaSqM - claimedAreaSqM) / claimedAreaSqM) * 100;

  if (deviationPct <= thresholds.areaMatchPct) {
    return {
      status: "MATCH",
      claimedAreaSqM,
      measuredAreaSqM,
      deviationPct: Number(deviationPct.toFixed(1)),
      explanation: `Measured area closely aligns with claim (deviation: ${deviationPct.toFixed(1)}%).`,
    };
  }

  if (deviationPct <= thresholds.areaPartialPct) {
    return {
      status: "PARTIAL",
      claimedAreaSqM,
      measuredAreaSqM,
      deviationPct: Number(deviationPct.toFixed(1)),
      explanation: `Minor area variance observed (${deviationPct.toFixed(1)}% deviation). Requires field officer cross-check.`,
    };
  }

  return {
    status: "MISMATCH",
    claimedAreaSqM,
    measuredAreaSqM,
    deviationPct: Number(deviationPct.toFixed(1)),
    explanation: `Significant area variance detected (${deviationPct.toFixed(1)}% deviation between satellite perimeter and farmer claim).`,
  };
}

/**
 * 2. Crop check
 */
export function scoreCrop(
  claimedCrop: string,
  targetSeasonPrediction?: MonitoringPrediction,
  thresholds: ScoringThresholds = DEFAULT_THRESHOLDS
): CropScoreResult {
  // Check if claimed crop is supported by AMED model
  const isSupported = SUPPORTED_CROPS.includes(claimedCrop as (typeof SUPPORTED_CROPS)[number]);
  if (!isSupported) {
    return {
      status: "NOT_VERIFIABLE",
      claimedCrop,
      explanation: `"${claimedCrop}" is a specialty or non-classified crop not directly modeled by AMED satellite classifications. Area and vegetative growth are verifiable, but specific variety requires field observation.`,
    };
  }

  if (!targetSeasonPrediction) {
    return {
      status: "NO_CULTIVATION_DETECTED",
      claimedCrop,
      explanation: "No satellite monitoring prediction available for this specific season window (possibly cloud cover or unrecorded season).",
    };
  }

  const { crop_1, conf_1, crop_2, conf_2 } = targetSeasonPrediction;

  if (crop_1 === "NO_PREDICTION") {
    return {
      status: "NO_CULTIVATION_DETECTED",
      claimedCrop,
      detectedCrop1: crop_1,
      conf1: conf_1,
      explanation: "Satellite imagery detected no active cultivation signature or imagery was obscured by cloud cover.",
    };
  }

  if (crop_1 === "UNKNOWN_CROP") {
    return {
      status: "NOT_VERIFIABLE",
      claimedCrop,
      detectedCrop1: crop_1,
      conf1: conf_1,
      explanation: "Active crop cultivation was confirmed by satellite vegetation indices, but the specific crop type could not be classified.",
    };
  }

  const normClaim = claimedCrop.toLowerCase().trim();
  const normCrop1 = crop_1?.toLowerCase().trim();
  const normCrop2 = crop_2?.toLowerCase().trim();

  // Strong Match: claimed = crop_1 with conf > 0.7
  if (normClaim === normCrop1 && conf_1 >= thresholds.cropStrongConf) {
    return {
      status: "STRONG_MATCH",
      claimedCrop,
      detectedCrop1: crop_1,
      conf1: conf_1,
      detectedCrop2: crop_2,
      conf2: conf_2,
      explanation: `Satellite observations strongly confirm ${crop_1} cultivation with ${(conf_1 * 100).toFixed(0)}% confidence.`,
    };
  }

  // Probable Match: claimed = crop_1 or crop_2 with conf >= 0.5
  if (
    (normClaim === normCrop1 && conf_1 >= thresholds.cropProbableConf) ||
    (normClaim === normCrop2 && (conf_2 ?? 0) >= thresholds.cropProbableConf)
  ) {
    const matchedCrop = normClaim === normCrop1 ? crop_1 : crop_2;
    const matchedConf = normClaim === normCrop1 ? conf_1 : (conf_2 ?? 0);
    return {
      status: "PROBABLE_MATCH",
      claimedCrop,
      detectedCrop1: crop_1,
      conf1: conf_1,
      detectedCrop2: crop_2,
      conf2: conf_2,
      explanation: `Satellite data indicates probable ${matchedCrop} cultivation (${(matchedConf * 100).toFixed(0)}% confidence).`,
    };
  }

  // Mismatch
  return {
    status: "MISMATCH",
    claimedCrop,
    detectedCrop1: crop_1,
    conf1: conf_1,
    detectedCrop2: crop_2,
    conf2: conf_2,
    explanation: `Discrepancy detected: Farmer claimed ${claimedCrop}, whereas satellite models detected ${crop_1} (${(conf_1 * 100).toFixed(0)}% confidence)${crop_2 ? ` and ${crop_2} (${((conf_2 ?? 0) * 100).toFixed(0)}%)` : ""}.`,
  };
}

/**
 * 3. History check (last N years)
 */
export function scoreHistory(
  predictions: MonitoringPrediction[],
  claimedCrop: string,
  thresholds: ScoringThresholds = DEFAULT_THRESHOLDS
): HistoryScoreResult {
  if (!predictions || predictions.length === 0) {
    return {
      score: 50,
      totalSeasons: 0,
      cultivatedSeasons: 0,
      seasonsSummary: [],
      explanation: "No historical seasons available for this field.",
      hasLongFallow: false,
    };
  }

  // Sort chronologically
  const sorted = [...predictions].sort((a, b) => b.start_timestamp_sec - a.start_timestamp_sec);
  const maxSeasons = thresholds.historyYears * 2; // ~2-3 seasons per year
  const recent = sorted.slice(0, maxSeasons);

  let cultivatedCount = 0;
  let fallowRun = 0;
  let maxFallowRun = 0;
  let matchingCropCount = 0;

  const summary = recent.map((p, idx) => {
    const isCultivated = p.crop_1 !== "NO_PREDICTION";
    if (isCultivated) {
      cultivatedCount++;
      fallowRun = 0;
      if (p.crop_1.toLowerCase() === claimedCrop.toLowerCase()) {
        matchingCropCount++;
      }
    } else {
      fallowRun++;
      if (fallowRun > maxFallowRun) maxFallowRun = fallowRun;
    }

    const year = new Date(p.start_timestamp_sec * 1000).getFullYear();
    return {
      seasonLabel: p.season_id || `Season ${recent.length - idx} (${year})`,
      crop: p.crop_1,
      conf: p.conf_1,
    };
  });

  const total = recent.length;
  const consistencyScore = Math.round((cultivatedCount / Math.max(total, 1)) * 100);
  const hasLongFallow = maxFallowRun >= 3;

  let explanation = `Cultivated in ${cultivatedCount} of the last ${total} observed seasons.`;
  if (matchingCropCount > 1) {
    explanation += ` Frequent ${claimedCrop} rotation history confirmed.`;
  }
  if (hasLongFallow) {
    explanation += " Note: Field experienced consecutive fallow seasons.";
  }

  return {
    score: consistencyScore,
    totalSeasons: total,
    cultivatedSeasons: cultivatedCount,
    seasonsSummary: summary,
    explanation,
    hasLongFallow,
  };
}

/**
 * 4. Boundary check
 */
export function scoreBoundary(
  aluConfidence: number,
  thresholds: ScoringThresholds = DEFAULT_THRESHOLDS
): BoundaryScoreResult {
  if (aluConfidence >= thresholds.boundaryHighConf) {
    return {
      confidence: aluConfidence,
      tier: "HIGH",
      needsOnsiteVerification: false,
      explanation: `High boundary clarity (${(aluConfidence * 100).toFixed(0)}%). Field edges are sharply defined by satellite segmentation.`,
    };
  }

  if (aluConfidence >= thresholds.boundaryMedConf) {
    return {
      confidence: aluConfidence,
      tier: "MEDIUM",
      needsOnsiteVerification: false,
      explanation: `Good boundary definition (${(aluConfidence * 100).toFixed(0)}%). Standard agricultural parcel.`,
    };
  }

  return {
    confidence: aluConfidence,
    tier: "LOW",
    needsOnsiteVerification: true,
    explanation: `Low boundary confidence (${(aluConfidence * 100).toFixed(0)}%). Suggest onsite boundary confirmation with Field Officer GPS.`,
  };
}

/**
 * 5. Overall composite scoring
 */
export function evaluateOverallClaim(
  claimedAreaSqM: number,
  measuredAreaSqM: number,
  claimedCrop: string,
  targetSeasonPrediction: MonitoringPrediction | undefined,
  historicalPredictions: MonitoringPrediction[],
  boundaryConfidence: number,
  thresholds: ScoringThresholds = DEFAULT_THRESHOLDS
): VerificationScores {
  const area = scoreArea(claimedAreaSqM, measuredAreaSqM, thresholds);
  const crop = scoreCrop(claimedCrop, targetSeasonPrediction, thresholds);
  const history = scoreHistory(historicalPredictions, claimedCrop, thresholds);
  const boundary = scoreBoundary(boundaryConfidence, thresholds);

  const reasons: string[] = [];

  // Determine overall status
  // Verified: area match + crop strong/probable + consistency >= 60.
  // Needs field visit: any partial, low-confidence, or not-verifiable result.
  // Mismatch: area or crop mismatch.
  let overallStatus: OverallStatus = "NEEDS_VISIT";

  if (area.status === "MISMATCH") {
    overallStatus = "MISMATCH";
    reasons.push(area.explanation);
  }

  if (crop.status === "MISMATCH") {
    overallStatus = "MISMATCH";
    reasons.push(crop.explanation);
  }

  if (overallStatus !== "MISMATCH") {
    const isAreaMatch = area.status === "MATCH";
    const isCropMatch = crop.status === "STRONG_MATCH" || crop.status === "PROBABLE_MATCH";
    const isHistoryGood = history.score >= thresholds.historyConsistencyMin;
    const isBoundaryClean = !boundary.needsOnsiteVerification;

    if (isAreaMatch && isCropMatch && isHistoryGood && isBoundaryClean) {
      overallStatus = "VERIFIED";
      reasons.push(area.explanation);
      reasons.push(crop.explanation);
      reasons.push(history.explanation);
    } else {
      overallStatus = "NEEDS_VISIT";
      if (area.status === "PARTIAL") reasons.push(area.explanation);
      if (crop.status === "NOT_VERIFIABLE") reasons.push(crop.explanation);
      if (crop.status === "NO_CULTIVATION_DETECTED") reasons.push(crop.explanation);
      if (!isHistoryGood) reasons.push(history.explanation);
      if (boundary.needsOnsiteVerification) reasons.push(boundary.explanation);
    }
  }

  // Composite numerical score
  let scoreSum = 0;
  // Area factor: Match=35, Partial=20, Mismatch=0
  scoreSum += area.status === "MATCH" ? 35 : area.status === "PARTIAL" ? 20 : 0;
  // Crop factor: Strong=40, Probable=30, NotVerifiable=20, Mismatch=0
  scoreSum +=
    crop.status === "STRONG_MATCH"
      ? 40
      : crop.status === "PROBABLE_MATCH"
      ? 30
      : crop.status === "NOT_VERIFIABLE"
      ? 20
      : 0;
  // History factor: (score / 100) * 15
  scoreSum += Math.round((history.score / 100) * 15);
  // Boundary factor: (boundary.confidence * 10)
  scoreSum += Math.round(boundary.confidence * 10);

  return {
    overallStatus,
    overallScore: Math.min(100, Math.max(0, scoreSum)),
    area,
    crop,
    history,
    boundary,
    reasons,
  };
}
