import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  HelpCircle,
  Eye,
  CloudOff,
} from "lucide-react";

export type StatusChipType =
  | "VERIFIED"
  | "NEEDS_VISIT"
  | "MISMATCH"
  | "PENDING"
  | "MATCH"
  | "PARTIAL"
  | "STRONG_MATCH"
  | "PROBABLE_MATCH"
  | "NOT_VERIFIABLE"
  | "NO_CULTIVATION_DETECTED"
  | "CONFIRMED"
  | "CORRECTED"
  | "REJECTED";

interface StatusChipProps {
  status: StatusChipType | string;
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function StatusChip({ status, label, className = "", size = "md" }: StatusChipProps) {
  const norm = status.toUpperCase().replace(/\s+/g, "_");

  let colorClasses = "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300";
  let icon = <Clock className="w-3.5 h-3.5" />;
  let defaultLabel = label || status;

  switch (norm) {
    case "VERIFIED":
    case "MATCH":
    case "STRONG_MATCH":
    case "CONFIRMED":
      colorClasses =
        "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700";
      icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      defaultLabel = label || (norm === "VERIFIED" ? "Verified" : norm === "STRONG_MATCH" ? "Strong Match" : norm === "CONFIRMED" ? "Confirmed" : "Match");
      break;

    case "PROBABLE_MATCH":
    case "PARTIAL":
    case "CORRECTED":
    case "NEEDS_VISIT":
    case "NEEDS_FIELD_VISIT":
      colorClasses =
        "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700";
      icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      defaultLabel =
        label ||
        (norm.includes("NEEDS")
          ? "Needs Field Visit"
          : norm === "PARTIAL"
          ? "Partial Match"
          : norm === "CORRECTED"
          ? "Corrected Onsite"
          : "Probable Match");
      break;

    case "MISMATCH":
    case "REJECTED":
      colorClasses =
        "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700";
      icon = <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
      defaultLabel = label || (norm === "REJECTED" ? "Rejected" : "Mismatch");
      break;

    case "NOT_VERIFIABLE":
      colorClasses =
        "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700";
      icon = <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
      defaultLabel = label || "Not Verifiable by Satellite";
      break;

    case "NO_CULTIVATION_DETECTED":
      colorClasses =
        "bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-700";
      icon = <CloudOff className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />;
      defaultLabel = label || "No Cultivation Detected";
      break;

    default:
      icon = <HelpCircle className="w-3.5 h-3.5 text-slate-500" />;
      break;
  }

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-xs gap-1"
      : size === "lg"
      ? "px-3.5 py-1.5 text-sm gap-2 font-medium"
      : "px-2.5 py-1 text-xs gap-1.5 font-medium";

  return (
    <span
      className={`inline-flex items-center rounded-md border shadow-2xs transition-colors ${sizeClasses} ${colorClasses} ${className}`}
    >
      {icon}
      <span>{defaultLabel}</span>
    </span>
  );
}
