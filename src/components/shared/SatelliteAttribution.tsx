import React, { useState } from "react";
import { Satellite, ShieldAlert, Calendar, Info, ChevronDown } from "lucide-react";

interface SatelliteAttributionProps {
  dataVersion?: string;
  updateTime?: string;
  lastCaptureDate?: string;
  captureDates?: Array<{ year: number; month: number; day: number }>;
  className?: string;
}

export function SatelliteAttribution({
  dataVersion = "2026.09.1",
  updateTime = "2026-09-15T04:30:00Z",
  lastCaptureDate = "12 Sep 2026",
  captureDates = [
    { year: 2026, month: 9, day: 12 },
    { year: 2026, month: 7, day: 24 },
    { year: 2026, month: 3, day: 10 },
    { year: 2025, month: 11, day: 5 },
    { year: 2025, month: 8, day: 18 },
  ],
  className = "",
}: SatelliteAttributionProps) {
  const [showHistory, setShowHistory] = useState(false);

  const formattedUpdateDate = updateTime
    ? new Date(updateTime).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "15 Sep 2026";

  return (
    <div
      className={`p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xs text-xs text-stone-600 dark:text-stone-400 space-y-2 shadow-xs ${className}`}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 font-semibold text-stone-800 dark:text-stone-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Satellite className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Google Agricultural Understanding API (ALU & AMED)</span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 font-sans font-semibold">
            <Calendar className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Last Image Taken: <strong>{lastCaptureDate}</strong></span>
          </div>
          <span className="text-stone-400">Ver: {dataVersion}</span>
          <span className="text-stone-400">•</span>
          <span className="text-stone-400">Model Updated: {formattedUpdateDate}</span>
          {captureDates && captureDates.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-[11px] font-sans font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              <span>{showHistory ? "Hide Passes" : "All Passes"}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showHistory ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {showHistory && captureDates && (
        <div className="pt-2 border-t border-stone-200 dark:border-stone-800/80 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
          {captureDates.map((cd, i) => {
            const dt = new Date(cd.year, cd.month - 1, cd.day);
            const str = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            return (
              <div
                key={i}
                className="px-2 py-1 rounded-md bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 flex items-center justify-between"
              >
                <span className="font-medium text-stone-700 dark:text-stone-300">{str}</span>
                {i === 0 && (
                  <span className="text-[9px] px-1 rounded bg-emerald-600 text-white font-bold uppercase">Latest</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-1.5 text-[11px] text-stone-500 dark:text-stone-500 pt-0.5">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
        <span>
          Satellite-derived boundaries & event detections generated from European Space Agency (ESA) Sentinel-2 (10m) & NASA/USGS Landsat-9 imagery. Intended for decision support, verification auditing, and supply chain transparency.
        </span>
      </div>
    </div>
  );
}
