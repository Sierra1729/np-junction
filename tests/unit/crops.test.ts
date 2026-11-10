import { describe, it, expect } from "vitest";
import {
  getPresentCropPrediction,
  getSortedPredictions,
  formatSeasonLabel,
  formatCropDisplayName,
  validateSeasonDuration,
  assessCropRotationPattern,
  MAJOR_CROPS_PAPER2,
  MAX_SEASON_LENGTH_DAYS,
} from "../../src/lib/agri-api/crops";
import { MonitoringPrediction } from "../../src/lib/agri-api/types";

describe("crops utility", () => {
  const samplePredictions: MonitoringPrediction[] = [
    {
      // Oldest: Rabi 2020 (Dec 2020 - Apr 2021)
      start_timestamp_sec: 1608270594,
      end_timestamp_sec: 1619070593,
      crop_1: "WHEAT",
      conf_1: 0.73,
    },
    {
      // Kharif 2021 (Jul 2021 - Oct 2021)
      start_timestamp_sec: 1627278602,
      end_timestamp_sec: 1635486601,
      crop_1: "RICE",
      conf_1: 0.64,
    },
    {
      // Latest: Kharif 2026 (Jul 2026 - Sep 2026)
      start_timestamp_sec: 1783230596,
      end_timestamp_sec: 1790747412,
      crop_1: "RICE",
      conf_1: 0.64,
    },
  ];

  it("selects the latest/present crop instead of index 0", () => {
    const present = getPresentCropPrediction(samplePredictions);
    expect(present).not.toBeNull();
    expect(present?.crop_1).toBe("RICE");
    expect(present?.start_timestamp_sec).toBe(1783230596);
  });

  it("sorts predictions from newest to oldest", () => {
    const sorted = getSortedPredictions(samplePredictions);
    expect(sorted.length).toBe(3);
    expect(sorted[0].crop_1).toBe("RICE"); // 2026
    expect(sorted[0].start_timestamp_sec).toBe(1783230596);
    expect(sorted[2].crop_1).toBe("WHEAT"); // 2020
  });

  it("formats season labels correctly", () => {
    const latest = samplePredictions[2];
    const label = formatSeasonLabel(latest, true);
    expect(label).toContain("Kharif 2026 (Present)");

    const oldest = samplePredictions[0];
    const oldestLabel = formatSeasonLabel(oldest, false);
    expect(oldestLabel).toContain("Rabi 2020");
  });

  it("formats crop display names accurately", () => {
    expect(formatCropDisplayName("RICE")).toBe("Paddy (Rice)");
    expect(formatCropDisplayName("WHEAT")).toBe("Wheat");
    expect(formatCropDisplayName("UNKNOWN_CROP")).toBe("Uncultivated");
    expect(formatCropDisplayName("GRAM")).toBe("Gram (Chana)");
    expect(formatCropDisplayName("BAJRA")).toBe("Bajra (Millet)");
  });

  it("verifies 12 major crops from Google DeepMind Paper 2", () => {
    expect(MAJOR_CROPS_PAPER2.length).toBe(12);
    expect(MAJOR_CROPS_PAPER2).toContain("Wheat");
    expect(MAJOR_CROPS_PAPER2).toContain("Rice");
    expect(MAJOR_CROPS_PAPER2).toContain("Sugarcane");
    expect(MAJOR_CROPS_PAPER2).toContain("Mustard");
  });

  it("validates normative season lengths according to Paper 2 Table C2", () => {
    // 120 days of Wheat (valid, max is 240 days)
    const validWheat = validateSeasonDuration("Wheat", 1000000, 1000000 + 120 * 86400);
    expect(validWheat.isValid).toBe(true);
    expect(validWheat.durationDays).toBe(120);

    // 260 days of Wheat (exceeds 240 days threshold in Table C2)
    const invalidWheat = validateSeasonDuration("Wheat", 1000000, 1000000 + 260 * 86400);
    expect(invalidWheat.isValid).toBe(false);
    expect(invalidWheat.maxAllowedDays).toBe(240);
  });

  it("diagnoses authentic Rice-Wheat rotation from multi-season history", () => {
    const rotation = assessCropRotationPattern(samplePredictions);
    expect(rotation.isRotational).toBe(true);
    expect(rotation.patternType).toBe("RICE_WHEAT_ROTATION");
    expect(rotation.summary).toContain("Rice-Wheat rotation verified");
  });
});
