import { describe, it, expect } from "vitest";
import { estimateHarvest } from "../../src/lib/harvest/estimator";

describe("Harvest Volume and Timeline Estimation", () => {
  it("estimates harvest volume based on crop yield and area", () => {
    // 1 hectare of Rice (2.8 t/ha)
    const areaSqM = 10000;
    const est = estimateHarvest("Rice", areaSqM);
    expect(est.areaHa).toBe(1);
    expect(est.expectedTons).toBe(2.8);
  });

  it("calculates active harvest when end_timestamp_sec is in the future", () => {
    const futureSec = Math.floor(Date.now() / 1000) + 30 * 86400; // 30 days ahead
    const startSec = futureSec - 100 * 86400;

    const est = estimateHarvest("Wheat", 20000, startSec, futureSec);
    expect(est.status).toBe("ACTIVE");
    expect(est.expectedTons).toBe(7.0); // 2 ha * 3.5 t/ha
    expect(est.harvestDate).toBeDefined();
    expect(est.harvestDate!.getTime()).toBeGreaterThan(Date.now());
  });

  it("returns NO_ACTIVE_CROP if no season dates are active or provided", () => {
    const pastSec = Math.floor(Date.now() / 1000) - 100 * 86400;
    const pastStart = pastSec - 120 * 86400;

    const est = estimateHarvest("Gram", 10000, pastStart, pastSec);
    expect(est.status).toBe("NO_ACTIVE_CROP");
    expect(est.expectedTons).toBe(0);
  });
});
