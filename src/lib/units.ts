export type LandAreaUnit = "acre" | "ha" | "kanal" | "bigha" | "sq_m";

export interface UnitConversionConfig {
  bighaInSqM: number; // Configurable per state (e.g. 2500 or 1618.7)
}

export const DEFAULT_UNIT_CONFIG: UnitConversionConfig = {
  bighaInSqM: 2500, // Standard central/western India default
};

export const UNIT_CONVERSIONS: Record<string, number> = {
  acre: 4046.86,
  ha: 10000.0,
  hectare: 10000.0,
  kanal: 505.86,
  sq_m: 1.0,
};

/**
 * Converts any claimed area into square meters.
 */
export function convertToSqMeters(
  value: number,
  unit: string,
  config: UnitConversionConfig = DEFAULT_UNIT_CONFIG
): number {
  const normalizedUnit = unit.toLowerCase().trim();
  if (normalizedUnit === "bigha") {
    return value * config.bighaInSqM;
  }
  const factor = UNIT_CONVERSIONS[normalizedUnit] ?? 4046.86; // default acre
  return value * factor;
}

/**
 * Converts square meters into target unit.
 */
export function convertFromSqMeters(
  sqMeters: number,
  targetUnit: string,
  config: UnitConversionConfig = DEFAULT_UNIT_CONFIG
): number {
  const normalizedUnit = targetUnit.toLowerCase().trim();
  if (normalizedUnit === "bigha") {
    return sqMeters / (config.bighaInSqM || 2500);
  }
  const factor = UNIT_CONVERSIONS[normalizedUnit] ?? 4046.86;
  return sqMeters / factor;
}

/**
 * Formats an area in user's unit with hectares in parentheses.
 * E.g. "2.40 acres (0.97 ha)"
 */
export function formatAreaWithHectares(
  sqMeters: number,
  unit: string = "acre",
  config: UnitConversionConfig = DEFAULT_UNIT_CONFIG
): string {
  const userVal = convertFromSqMeters(sqMeters, unit, config);
  const haVal = sqMeters / 10000;

  const unitLabel = unit === "ha" || unit === "hectare" ? "ha" : unit;
  if (unitLabel === "ha") {
    return `${haVal.toFixed(2)} ha`;
  }
  return `${userVal.toFixed(2)} ${unitLabel} (${haVal.toFixed(2)} ha)`;
}
