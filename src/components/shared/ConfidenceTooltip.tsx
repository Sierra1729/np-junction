import React from "react";
import { Info } from "lucide-react";

interface ConfidenceTooltipProps {
  source?: string;
  confidence?: number; // 0 to 1
  details?: string;
  className?: string;
}

export function ConfidenceTooltip({
  source = "Google Agricultural Understanding API (AMED)",
  confidence,
  details,
  className = "",
}: ConfidenceTooltipProps) {
  const confText =
    typeof confidence === "number" ? `${(confidence * 100).toFixed(0)}%` : undefined;

  return (
    <span className={`relative group inline-flex items-center cursor-help ml-1 ${className}`}>
      <Info className="w-3.5 h-3.5 text-slate-400 hover:text-emerald-600 transition-colors" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col w-56 p-2 bg-slate-900 text-white text-xs rounded-md shadow-lg z-50">
        <span className="font-semibold text-emerald-300">{source}</span>
        {confText && (
          <span className="mt-0.5 text-slate-300">
            Model Confidence: <span className="font-mono font-medium text-white">{confText}</span>
          </span>
        )}
        {details && <span className="mt-1 text-slate-300 text-[11px] leading-tight">{details}</span>}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </span>
    </span>
  );
}
