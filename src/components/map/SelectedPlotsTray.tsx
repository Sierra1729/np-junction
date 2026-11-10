"use client";

import React from "react";
import { AgriFeature } from "@/lib/agri-api/types";
import { formatAreaWithHectares } from "@/lib/units";
import {
  getPresentCropPrediction,
  formatCropDisplayName,
} from "@/lib/agri-api/crops";
import {
  CheckSquare,
  RotateCcw,
  ShieldCheck,
  ExternalLink,
  X,
} from "lucide-react";
import Link from "next/link";

interface SelectedPlotsTrayProps {
  allFeatures: AgriFeature[];
  selectedFieldIds: string[];
  onToggleField: (feature: AgriFeature) => void;
  onClearSelection: () => void;
  onSelectAllVisible: () => void;
  onActionClick?: () => void;
  actionLabel?: string;
  actionHref?: string;
  compact?: boolean;
}

export function SelectedPlotsTray({
  allFeatures,
  selectedFieldIds,
  onToggleField,
  onClearSelection,
  onSelectAllVisible,
  onActionClick,
  actionLabel = "Verify Claim for Selected Plots",
  actionHref,
  compact = false,
}: SelectedPlotsTrayProps) {
  const fields = allFeatures.filter((f) => f.properties.alu_type === "field");
  const selectedFields = fields.filter((f) => selectedFieldIds.includes(f.id));

  const totalAreaSqM = selectedFields.reduce((sum, f) => sum + (f.properties.area_sq_m || 0), 0);
  const formattedArea = formatAreaWithHectares(totalAreaSqM, "acre");

  // Aggregate detected crops based on active present season
  const cropCounts: Record<string, { count: number; conf: number }> = {};
  selectedFields.forEach((f) => {
    const p = getPresentCropPrediction(f.properties.monitoring_prediction);
    const cropName = p ? formatCropDisplayName(p.crop_1) : "Uncultivated";
    const conf = p ? p.conf_1 : 0;
    if (!cropCounts[cropName]) {
      cropCounts[cropName] = { count: 0, conf: 0 };
    }
    cropCounts[cropName].count += 1;
    cropCounts[cropName].conf = Math.max(cropCounts[cropName].conf, conf);
  });

  const cropsSummary = Object.entries(cropCounts)
    .map(([c, val]) => `${c.toUpperCase()} (${Math.round(val.conf * 100)}%)`)
    .join(", ");

  // Compact floating dock mode (for Full Window view)
  if (compact) {
    if (selectedFields.length === 0) return null;
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-stone-900/98 text-white backdrop-blur-xl rounded-2xl border border-stone-700/80 shadow-2xl text-xs max-w-fit">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-extrabold text-emerald-400 text-xs">
            {selectedFields.length} {selectedFields.length === 1 ? "plot" : "plots"} selected
          </span>
        </div>

        <div className="w-px h-3.5 bg-stone-700 shrink-0" />

        <div className="font-extrabold text-white shrink-0 text-xs">
          {formattedArea}
        </div>

        {cropsSummary && (
          <>
            <div className="w-px h-3.5 bg-stone-700 shrink-0 hidden sm:block" />
            <div className="text-emerald-300 font-bold truncate max-w-[180px] hidden sm:block text-xs">
              {cropsSummary}
            </div>
          </>
        )}

        <div className="w-px h-3.5 bg-stone-700 shrink-0" />

        {actionHref ? (
          <Link
            href={actionHref}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition-all shadow-xs shrink-0 flex items-center gap-1 text-xs active:scale-95"
          >
            <span>{actionLabel}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-90" />
          </Link>
        ) : onActionClick ? (
          <button
            type="button"
            onClick={onActionClick}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition-all shadow-xs shrink-0 text-xs active:scale-95 cursor-pointer"
          >
            {actionLabel}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onClearSelection}
          className="p-1 text-stone-400 hover:text-white rounded-lg transition-colors shrink-0 cursor-pointer"
          title="Clear Selection"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Standard tray mode (for standard dashboard grid)
  return (
    <div className="bg-stone-50 dark:bg-stone-900/90 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-3">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <span>Selected Plots:</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono text-xs">
              {selectedFields.length} of {fields.length}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={onSelectAllVisible}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition-colors font-medium text-[11px]"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>Select All Visible</span>
          </button>
          {selectedFields.length > 0 && (
            <button
              type="button"
              onClick={onClearSelection}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-stone-200 dark:border-stone-700 transition-colors font-medium text-[11px]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {selectedFields.length === 0 ? (
        <div className="py-2 text-center text-xs text-stone-500 dark:text-stone-400 flex items-center justify-center gap-2">
          <span>👆 Click on any delineated plot on the satellite map to select and inspect it.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary Metric Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-white dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800/80">
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
                Total Satellite Area
              </span>
              <span className="text-sm font-black text-stone-900 dark:text-stone-100">
                {formattedArea}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800/80">
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
                AMED Detected Crop
              </span>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate block">
                {cropsSummary || "Awaiting Detection"}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800/80">
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
                Parcels Selected
              </span>
              <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-mono text-stone-600 dark:text-stone-400">
                {selectedFields.map((f, i) => (
                  <span
                    key={f.id}
                    className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 shrink-0"
                    title={f.id}
                  >
                    #{i + 1}: {f.id.slice(-6)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Button */}
          {actionHref ? (
            <Link
              href={actionHref}
              className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{actionLabel}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </Link>
          ) : onActionClick ? (
            <button
              type="button"
              onClick={onActionClick}
              className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{actionLabel}</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
