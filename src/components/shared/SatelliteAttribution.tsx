import React from "react";
import { Satellite, ShieldAlert } from "lucide-react";

interface SatelliteAttributionProps {
  dataVersion?: string;
  updateTime?: string;
  className?: string;
}

export function SatelliteAttribution({
  dataVersion = "2026.09.1",
  updateTime = "2026-09-15T04:30:00Z",
  className = "",
}: SatelliteAttributionProps) {
  const formattedDate = updateTime
    ? new Date(updateTime).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Recent";

  return (
    <div
      className={`p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 ${className}`}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
          <Satellite className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Google Agricultural Understanding API (ALU & AMED)</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span>Ver: {dataVersion}</span>
          <span>•</span>
          <span>Updated: {formattedDate}</span>
        </div>
      </div>
      <div className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-500 pt-0.5">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
        <span>
          Satellite-derived estimate; not a legal land record. Intended for decision support,
          verification auditing, and supply chain transparency.
        </span>
      </div>
    </div>
  );
}
