import { describe, it, expect } from "vitest";
import {
  scoreArea,
  scoreCrop,
  scoreHistory,
  scoreBoundary,
  evaluateOverallClaim,
} from "../../src/lib/scoring";
import { MonitoringPrediction } from "../../src/lib/agri-api/types";

describe("Scoring Engine Tests", () => {
  describe("Area Scoring", () => {
    it("returns MATCH when area deviation <= 10%", () => {
      // Claimed 10,000 m², Measured 10,500 m² (5% deviation)
      const res = scoreArea(10000, 10500);
      expect(res.status).toBe("MATCH");
      expect(res.deviationPct).toBe(5);
    });

    it("returns PARTIAL when area deviation is between 10% and 25%", () => {
      // Claimed 10,000 m², Measured 11,800 m² (18% deviation)
      const res = scoreArea(10000, 11800);
      expect(res.status).toBe("PARTIAL");
      expect(res.deviationPct).toBe(18);
    });

    it("returns MISMATCH when area deviation > 25%", () => {
      // Claimed 10,000 m², Measured 14,000 m² (40% deviation)
      const res = scoreArea(10000, 14000);
      expect(res.status).toBe("MISMATCH");
      expect(res.deviationPct).toBe(40);
    });
  });

  describe("Crop Scoring", () => {
    it("returns STRONG_MATCH when claimed crop equals crop_1 with confidence > 0.7", () => {
      const pred: MonitoringPrediction = {
        start_timestamp_sec: 1781503200,
        end_timestamp_sec: 1792994400,
        crop_1: "Rice",
        conf_1: 0.88,
      };
      const res = scoreCrop("Rice", pred);
      expect(res.status).toBe("STRONG_MATCH");
      expect(res.conf1).toBe(0.88);
    });

    it("returns PROBABLE_MATCH when claimed crop equals crop_2 with confidence >= 0.5", () => {
      const pred: MonitoringPrediction = {
        start_timestamp_sec: 1781503200,
        end_timestamp_sec: 1792994400,
        crop_1: "Corn",
        conf_1: 0.55,
        crop_2: "Soybeans",
        conf_2: 0.52,
      };
      const res = scoreCrop("Soybeans", pred);
      expect(res.status).toBe("PROBABLE_MATCH");
    });

    it("returns NOT_VERIFIABLE for UNKNOWN_CROP", () => {
      const pred: MonitoringPrediction = {
        start_timestamp_sec: 1781503200,
        end_timestamp_sec: 1792994400,
        crop_1: "UNKNOWN_CROP",
        conf_1: 0.72,
      };
      const res = scoreCrop("Wheat", pred);
      expect(res.status).toBe("NOT_VERIFIABLE");
      expect(res.explanation).toContain("could not be classified");
    });

    it("returns NO_CULTIVATION_DETECTED for NO_PREDICTION", () => {
      const pred: MonitoringPrediction = {
        start_timestamp_sec: 1781503200,
        end_timestamp_sec: 1792994400,
        crop_1: "NO_PREDICTION",
        conf_1: 0.1,
      };
      const res = scoreCrop("Cotton", pred);
      expect(res.status).toBe("NO_CULTIVATION_DETECTED");
      expect(res.explanation).toContain("no active cultivation signature");
    });

    it("returns NOT_VERIFIABLE for unsupported crops like Tomato or Mango", () => {
      const res = scoreCrop("Tomato", undefined);
      expect(res.status).toBe("NOT_VERIFIABLE");
      expect(res.explanation).toContain("specialty or non-classified crop");
    });

    it("returns MISMATCH when satellite detects a different crop", () => {
      const pred: MonitoringPrediction = {
        start_timestamp_sec: 1781503200,
        end_timestamp_sec: 1792994400,
        crop_1: "Rice",
        conf_1: 0.91,
      };
      const res = scoreCrop("Wheat", pred);
      expect(res.status).toBe("MISMATCH");
      expect(res.explanation).not.toContain("fraud");
    });
  });

  describe("History Scoring", () => {
    it("computes consistency percentage and explains history", () => {
      const preds: MonitoringPrediction[] = [
        { start_timestamp_sec: 1780000000, end_timestamp_sec: 1790000000, crop_1: "Rice", conf_1: 0.9 },
        { start_timestamp_sec: 1760000000, end_timestamp_sec: 1770000000, crop_1: "Wheat", conf_1: 0.85 },
        { start_timestamp_sec: 1740000000, end_timestamp_sec: 1750000000, crop_1: "Rice", conf_1: 0.9 },
        { start_timestamp_sec: 1720000000, end_timestamp_sec: 1730000000, crop_1: "NO_PREDICTION", conf_1: 0.1 },
      ];

      const res = scoreHistory(preds, "Rice");
      // 3 of 4 seasons cultivated = 75%
      expect(res.score).toBe(75);
      expect(res.cultivatedSeasons).toBe(3);
      expect(res.totalSeasons).toBe(4);
      expect(res.explanation).toContain("Cultivated in 3 of the last 4");
    });
  });

  describe("Boundary Scoring", () => {
    it("classifies high, medium, and low confidence boundaries", () => {
      expect(scoreBoundary(0.95).tier).toBe("HIGH");
      expect(scoreBoundary(0.95).needsOnsiteVerification).toBe(false);

      expect(scoreBoundary(0.82).tier).toBe("MEDIUM");
      expect(scoreBoundary(0.82).needsOnsiteVerification).toBe(false);

      expect(scoreBoundary(0.68).tier).toBe("LOW");
      expect(scoreBoundary(0.68).needsOnsiteVerification).toBe(true);
    });
  });

  describe("Overall Claim Evaluation", () => {
    it("marks claim VERIFIED when all indicators align", () => {
      const pred: MonitoringPrediction = {
        start_timestamp_sec: 1781503200,
        end_timestamp_sec: 1792994400,
        crop_1: "Rice",
        conf_1: 0.92,
      };

      const evalResult = evaluateOverallClaim(
        10000, // claimed
        10200, // measured (2% dev)
        "Rice",
        pred,
        [pred, pred, pred],
        0.92 // boundary conf
      );

      expect(evalResult.overallStatus).toBe("VERIFIED");
      expect(evalResult.overallScore).toBeGreaterThanOrEqual(80);
    });

    it("marks claim NEEDS_VISIT when there is partial variance or unsupported crop", () => {
      const pred: MonitoringPrediction = {
        start_timestamp_sec: 1781503200,
        end_timestamp_sec: 1792994400,
        crop_1: "Rice",
        conf_1: 0.92,
      };

      const evalResult = evaluateOverallClaim(
        10000,
        11800, // 18% dev -> PARTIAL
        "Rice",
        pred,
        [pred],
        0.92
      );

      expect(evalResult.overallStatus).toBe("NEEDS_VISIT");
    });

    it("marks claim MISMATCH on major deviation without using accusatory language", () => {
      const pred: MonitoringPrediction = {
        start_timestamp_sec: 1781503200,
        end_timestamp_sec: 1792994400,
        crop_1: "Wheat",
        conf_1: 0.9,
      };

      const evalResult = evaluateOverallClaim(
        10000,
        10000,
        "Rice", // Farmer claimed Rice, satellite detected Wheat
        pred,
        [pred],
        0.9
      );

      expect(evalResult.overallStatus).toBe("MISMATCH");
      for (const reason of evalResult.reasons) {
        expect(reason.toLowerCase()).not.toContain("fraud");
        expect(reason.toLowerCase()).not.toContain("reject");
      }
    });
  });
});
