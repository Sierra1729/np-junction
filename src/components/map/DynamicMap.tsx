"use client";

import dynamic from "next/dynamic";
import React from "react";
import { AgriFeature, AgriFeatureCollection, GeoJsonGeometry } from "@/lib/agri-api/types";

export interface DynamicMapProps {
  center?: [number, number];
  zoom?: number;
  features?: AgriFeatureCollection;
  selectedFieldIds?: string[];
  onFieldClick?: (feature: AgriFeature) => void;
  onMapClick?: (latLng: { lat: number; lng: number }) => void;
  onPolygonDrawn?: (geometry: GeoJsonGeometry) => void;
  enableDraw?: boolean;
  className?: string;
  colorBy?: "crop" | "status" | "alu";
  showSearch?: boolean;
  showSelectionTray?: boolean;
  onAreaSelect?: (area: { lat: number; lng: number; name: string }) => void;
  isSearchingArea?: boolean;
  onClearSelection?: () => void;
  onSelectAllVisible?: () => void;
  actionLabel?: string;
  actionHref?: string;
  onActionClick?: () => void;
  onLoadCurrentView?: (center: { lat: number; lng: number }) => void;
  lastCaptureDate?: string;
  captureDates?: Array<{ year: number; month: number; day: number }>;
}

const DynamicMapInner = dynamic(
  () =>
    import("./MapContainerInner").then((mod) => ({
      default: mod.MapContainerInner,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[620px] w-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mb-3" />
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Loading interactive satellite map...
        </span>
      </div>
    ),
  }
);

export function DynamicMap(props: DynamicMapProps) {
  return <DynamicMapInner {...props} />;
}
