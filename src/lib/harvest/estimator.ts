export interface CropYieldConfig {
  yieldTonsPerHa: number;
  durationDays: number;
}

export const DEFAULT_CROP_CONFIGS: Record<string, CropYieldConfig> = {
  Rice: { yieldTonsPerHa: 2.8, durationDays: 120 },
  Wheat: { yieldTonsPerHa: 3.5, durationDays: 135 },
  Mustard: { yieldTonsPerHa: 1.4, durationDays: 120 },
  Gram: { yieldTonsPerHa: 1.1, durationDays: 110 },
  Soybeans: { yieldTonsPerHa: 1.1, durationDays: 100 },
  Cotton: { yieldTonsPerHa: 0.45, durationDays: 170 },
  "Cotton (lint)": { yieldTonsPerHa: 0.45, durationDays: 170 },
  Sugarcane: { yieldTonsPerHa: 80.0, durationDays: 365 },
  Groundnut: { yieldTonsPerHa: 1.7, durationDays: 110 },
  Corn: { yieldTonsPerHa: 3.3, durationDays: 110 },
  Bajra: { yieldTonsPerHa: 1.4, durationDays: 85 },
  Sorghum: { yieldTonsPerHa: 1.0, durationDays: 110 },
  Chilli: { yieldTonsPerHa: 2.0, durationDays: 160 },
};

export interface HarvestEstimate {
  crop: string;
  areaHa: number;
  expectedTons: number;
  harvestDate: Date | null;
  status: "ACTIVE" | "COMPLETED" | "NO_ACTIVE_CROP";
  harvestWindowStart: Date | null;
  harvestWindowEnd: Date | null;
}

/**
 * Calculates harvest estimate (volume and date) for a field's current crop.
 */
export function estimateHarvest(
  crop: string,
  areaSqM: number,
  startTsSec?: number,
  endTsSec?: number,
  customConfigs: Record<string, CropYieldConfig> = DEFAULT_CROP_CONFIGS
): HarvestEstimate {
  const areaHa = areaSqM / 10000;
  const config = customConfigs[crop] ?? { yieldTonsPerHa: 2.0, durationDays: 120 };
  const expectedTons = Number((areaHa * config.yieldTonsPerHa).toFixed(2));

  // If no dates provided, estimate baseline potential harvest
  if (startTsSec === undefined && endTsSec === undefined) {
    const projectedEnd = new Date(Date.now() + config.durationDays * 86400 * 1000);
    return {
      crop,
      areaHa,
      expectedTons,
      harvestDate: projectedEnd,
      status: "ACTIVE",
      harvestWindowStart: new Date(projectedEnd.getTime() - 7 * 86400 * 1000),
      harvestWindowEnd: new Date(projectedEnd.getTime() + 7 * 86400 * 1000),
    };
  }

  const nowSec = Math.floor(Date.now() / 1000);

  if (endTsSec && endTsSec > nowSec) {
    const harvestDate = new Date(endTsSec * 1000);
    const windowStart = new Date((endTsSec - 7 * 86400) * 1000);
    const windowEnd = new Date((endTsSec + 7 * 86400) * 1000);
    return {
      crop,
      areaHa,
      expectedTons,
      harvestDate,
      status: "ACTIVE",
      harvestWindowStart: windowStart,
      harvestWindowEnd: windowEnd,
    };
  }

  if (startTsSec && startTsSec <= nowSec) {
    const projectedEndSec = startTsSec + config.durationDays * 86400;
    if (projectedEndSec > nowSec) {
      const harvestDate = new Date(projectedEndSec * 1000);
      const windowStart = new Date((projectedEndSec - 7 * 86400) * 1000);
      const windowEnd = new Date((projectedEndSec + 7 * 86400) * 1000);
      return {
        crop,
        areaHa,
        expectedTons,
        harvestDate,
        status: "ACTIVE",
        harvestWindowStart: windowStart,
        harvestWindowEnd: windowEnd,
      };
    }
  }

  return {
    crop,
    areaHa,
    expectedTons: 0,
    harvestDate: null,
    status: "NO_ACTIVE_CROP",
    harvestWindowStart: null,
    harvestWindowEnd: null,
  };
}
