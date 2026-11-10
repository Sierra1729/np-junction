import React from "react";
import { Sparkles } from "lucide-react";

interface DemoBadgeProps {
  isMock?: boolean;
  className?: string;
}

export function DemoBadge({ isMock = true, className = "" }: DemoBadgeProps) {
  if (!isMock) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 shadow-xs ${className}`}
      title="Google Agricultural Understanding API is running with realistic fixture data around lat 18.624, lng 73.076"
    >
      <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
      <span>DEMO DATA (MOCK)</span>
    </div>
  );
}
