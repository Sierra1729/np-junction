export type AgriSeason = "Kharif" | "Rabi" | "Zaid";

export interface SeasonInfo {
  season: AgriSeason;
  year: number;
  label: string;
}

/**
 * Determines the Indian agricultural season for a given Unix timestamp in seconds.
 * Sowing month Jun–Sep -> Kharif
 * Sowing month Oct–Jan -> Rabi
 * Sowing month Feb–May -> Zaid
 */
export function getSeasonFromTimestampSec(timestampSec: number): SeasonInfo {
  // Convert to IST (UTC+5:30)
  const date = new Date((timestampSec + 5.5 * 3600) * 1000);
  const month = date.getUTCMonth() + 1; // 1-12
  const year = date.getUTCFullYear();

  let season: AgriSeason = "Kharif";
  let seasonYear = year;

  if (month >= 6 && month <= 9) {
    season = "Kharif";
    seasonYear = year;
  } else if (month >= 10 || month === 1) {
    season = "Rabi";
    // Rabi sown in Oct-Dec of year Y belongs to agricultural year Y or Y-(Y+1)
    seasonYear = month >= 10 ? year : year - 1;
  } else if (month >= 2 && month <= 5) {
    season = "Zaid";
    seasonYear = year;
  }

  return {
    season,
    year: seasonYear,
    label: `${season} ${seasonYear}`,
  };
}

/**
 * Returns estimated Unix timestamp boundaries [startSec, endSec] for a claimed season and year.
 */
export function getSeasonBoundsSec(season: AgriSeason, year: number): { startSec: number; endSec: number } {
  let startMonth = 6;
  let endMonth = 11;
  let startYear = year;
  let endYear = year;

  if (season === "Kharif") {
    startMonth = 6; // June 1
    endMonth = 10; // Oct 31
  } else if (season === "Rabi") {
    startMonth = 10; // Oct 1
    endMonth = 3; // Mar 31 of next year
    endYear = year + 1;
  } else if (season === "Zaid") {
    startMonth = 2; // Feb 1
    endMonth = 5; // May 31
  }

  const start = Math.floor(new Date(Date.UTC(startYear, startMonth - 1, 1)).getTime() / 1000);
  const end = Math.floor(new Date(Date.UTC(endYear, endMonth, 0, 23, 59, 59)).getTime() / 1000);

  return { startSec: start, endSec: end };
}
