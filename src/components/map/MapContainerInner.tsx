"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MapContainer, useMapEvents, useMap } from "react-leaflet";
import { fixLeafletIcons } from "./leaflet-fix";
import { BasemapControl, BasemapType } from "./BasemapControl";
import { FieldLayer } from "./FieldLayer";
import { DrawControl } from "./DrawControl";
import { MapAreaSearch, AreaLocation } from "./MapAreaSearch";
import { SelectedPlotsTray } from "./SelectedPlotsTray";
import { AgriFeature, AgriFeatureCollection, GeoJsonGeometry } from "@/lib/agri-api/types";
import { formatAreaWithHectares } from "@/lib/units";
import {
  getPresentCropPrediction,
  getSortedPredictions,
  formatSeasonLabel,
  formatCropDisplayName,
} from "@/lib/agri-api/crops";
import {
  Layers,
  Crosshair,
  Maximize2,
  Minimize2,
  X,
  MapPin,
  ShieldCheck,
  Sprout,
  Calendar,
  ArrowRight,
  Satellite,
} from "lucide-react";

interface MapContainerInnerProps {
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

function SatelliteCaptureBadge({
  lastCaptureDate = "12 Sep 2026",
  captureDates,
}: {
  lastCaptureDate?: string;
  captureDates?: Array<{ year: number; month: number; day: number }>;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="absolute bottom-3 right-3 sm:right-4 z-1000">
      <div
        onClick={() => setShowTooltip(!showTooltip)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-900/90 hover:bg-stone-900 backdrop-blur-md rounded-xl border border-stone-700/70 text-white shadow-md text-[11px] cursor-pointer transition-all select-none"
        title="Click to view satellite acquisition details"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Satellite className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-stone-300 font-medium hidden sm:inline">Last Image:</span>
        <span className="font-extrabold text-white">{lastCaptureDate}</span>
      </div>

      {showTooltip && (
        <div className="absolute bottom-10 right-0 w-64 bg-stone-900/98 backdrop-blur-xl border border-stone-700/80 rounded-2xl p-3 shadow-2xl text-white space-y-2 text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-stone-800">
            <span className="font-bold text-emerald-400 text-[11px] uppercase tracking-wider">
              Satellite Pass History
            </span>
            <button
              type="button"
              onClick={() => setShowTooltip(false)}
              className="text-stone-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between font-semibold">
              <span className="text-stone-300">Latest Pass:</span>
              <span className="text-emerald-300 font-bold">{lastCaptureDate} (Clear Sky)</span>
            </div>
            {captureDates && captureDates.length > 0 ? (
              captureDates.slice(1, 5).map((cd, i) => {
                const dt = new Date(cd.year, cd.month - 1, cd.day);
                const str = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                return (
                  <div key={i} className="flex justify-between text-stone-400">
                    <span>Prior Pass:</span>
                    <span>{str}</span>
                  </div>
                );
              })
            ) : (
              <>
                <div className="flex justify-between text-stone-400">
                  <span>Prior Pass:</span>
                  <span>24 Jul 2026</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Rabi Harvest:</span>
                  <span>10 Mar 2026</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Baseline:</span>
                  <span>05 Nov 2025</span>
                </div>
              </>
            )}
          </div>
          <div className="pt-1.5 border-t border-stone-800 text-[10px] text-stone-400 space-y-0.5">
            <div><strong>Constellation:</strong> Sentinel-2 & Landsat-9</div>
            <div><strong>Revisit Cycle:</strong> Every 5 days</div>
            <div><strong>AI Model:</strong> Google ALU v2026.09.1</div>
          </div>
        </div>
      )}
    </div>
  );
}

function MapClickHandler({ onClick }: { onClick?: (latLng: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      if (onClick) {
        onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

function MapLoadCenterButton({ onLoad }: { onLoad: (center: { lat: number; lng: number }) => void }) {
  const map = useMap();
  return (
    <div className="absolute top-3 left-14 z-1000">
      <button
        type="button"
        onClick={() => {
          const c = map.getCenter();
          onLoad({ lat: c.lat, lng: c.lng });
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer"
        title="Load satellite farmland boundaries for the area currently in view"
      >
        <Crosshair className="w-3.5 h-3.5" />
        <span>Map Farmland Around Here</span>
      </button>
    </div>
  );
}

function CoordinatesBadge({ initialCenter }: { initialCenter: [number, number] }) {
  const map = useMap();
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialCenter[0],
    lng: initialCenter[1],
  });

  useMapEvents({
    move() {
      const c = map.getCenter();
      setCoords({ lat: c.lat, lng: c.lng });
    },
  });

  return (
    <div className="absolute bottom-3 left-14 z-1000 hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-xs rounded-lg text-[10px] text-white/90 font-mono shadow-xs pointer-events-none">
      <Crosshair className="w-3 h-3 text-emerald-400" />
      <span>
        {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
      </span>
    </div>
  );
}

function FullscreenResizeHandler({ isFullscreen }: { isFullscreen: boolean }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullscreen, map]);
  return null;
}

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  const prevCenterRef = React.useRef<[number, number]>(center);
  const mountedRef = React.useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevCenterRef.current = center;
      return;
    }

    if (!map) return;

    const prev = prevCenterRef.current;
    if (
      prev &&
      Math.abs(prev[0] - center[0]) < 0.0003 &&
      Math.abs(prev[1] - center[1]) < 0.0003
    ) {
      return;
    }

    prevCenterRef.current = center;

    const timer = setTimeout(() => {
      try {
        const currentZoom = map.getZoom();
        if ((map as any)._loaded) {
          map.flyTo(center, currentZoom, { duration: 1.2 });
        } else {
          map.setView(center, currentZoom);
        }
      } catch {
        try {
          map.setView(center, map.getZoom());
        } catch {}
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [center[0], center[1], map]);

  return null;
}

export function MapContainerInner({
  center = [32.624964, 74.752361],
  zoom = 16,
  features,
  selectedFieldIds = [],
  onFieldClick,
  onMapClick,
  onPolygonDrawn,
  enableDraw = false,
  className = "h-[620px] w-full",
  colorBy = "crop",
  showSearch = true,
  showSelectionTray = false,
  onAreaSelect,
  isSearchingArea = false,
  onClearSelection,
  onSelectAllVisible,
  actionLabel,
  actionHref,
  onActionClick,
  onLoadCurrentView,
  lastCaptureDate = "12 Sep 2026",
  captureDates,
}: MapContainerInnerProps) {
  const [basemap, setBasemap] = useState<BasemapType>("google-hybrid");
  const [activeCenter, setActiveCenter] = useState<[number, number]>(center);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inspectedFeature, setInspectedFeature] = useState<AgriFeature | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and reset viewport scroll when entering Full Window
  useEffect(() => {
    if (isFullscreen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.scrollTo(0, 0);
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isFullscreen]);

  useEffect(() => {
    fixLeafletIcons();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    setActiveCenter(center);
  }, [center[0], center[1]]);

  // Sync inspectedFeature if selectedFieldIds change externally
  useEffect(() => {
    if (selectedFieldIds && selectedFieldIds.length > 0 && features) {
      const match = features.features.find((f) => f.id === selectedFieldIds[selectedFieldIds.length - 1]);
      if (match) setInspectedFeature(match);
    }
  }, [selectedFieldIds, features]);

  const handleSelectArea = (location: AreaLocation) => {
    const newCenter: [number, number] = [location.lat, location.lng];
    setActiveCenter(newCenter);
    if (onAreaSelect) {
      onAreaSelect({ lat: location.lat, lng: location.lng, name: location.name });
    }
  };

  const handleFieldClickInternal = (feat: AgriFeature) => {
    setInspectedFeature(feat);
    if (onFieldClick) {
      onFieldClick(feat);
    }
  };

  const handleClear = () => {
    setInspectedFeature(null);
    if (onClearSelection) {
      onClearSelection();
    }
  };

  const handleSelectAll = () => {
    if (onSelectAllVisible) {
      onSelectAllVisible();
    }
  };

  // FULLSCREEN / FULL WINDOW MODE (Floating HUD, 100% Map Screen Area via Portal)
  if (isFullscreen) {
    const fullscreenContent = (
      <div className="fixed inset-0 z-[9999] w-full h-full overflow-hidden bg-stone-950">
        {/* Full-bleed Map Canvas */}
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
          zoomControl={true}
          minZoom={3}
          maxZoom={22}
          className="h-full w-full absolute inset-0"
        >
          <FullscreenResizeHandler isFullscreen={true} />
          <MapRecenter center={activeCenter} />
          <CoordinatesBadge initialCenter={center} />
          <SatelliteCaptureBadge lastCaptureDate={lastCaptureDate} captureDates={captureDates} />
          <BasemapControl basemap={basemap} />
          {features && (
            <FieldLayer
              features={features}
              selectedFieldIds={selectedFieldIds}
              onFieldClick={handleFieldClickInternal}
              colorBy={colorBy}
            />
          )}
          <DrawControl
            enableDraw={enableDraw}
            onPolygonDrawn={onPolygonDrawn}
            onPinDropped={onMapClick}
          />
          <MapClickHandler onClick={onMapClick} />
        </MapContainer>

        {/* Floating Top-Left Search Bar */}
        {showSearch && (
          <div className="absolute top-4 sm:top-5 left-14 z-[1001] w-[340px] sm:w-[400px] max-w-[calc(100vw-80px)] bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xl p-2.5">
            <MapAreaSearch
              onSelectArea={handleSelectArea}
              isLoading={isSearchingArea}
            />
          </div>
        )}

        {/* Floating "Map Farmland Around Here" Button */}
        {onLoadCurrentView && (
          <div className="absolute top-4 sm:top-5 left-[460px] z-[1001] hidden xl:block">
            <button
              type="button"
              onClick={() => onLoadCurrentView({ lat: activeCenter[0], lng: activeCenter[1] })}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-lg transition-all cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Map Farmland Around Here</span>
            </button>
          </div>
        )}

        {/* Floating Top-Right Controls (Basemap Switcher & Exit Full Window) */}
        <div className="absolute top-4 sm:top-5 right-5 sm:right-7 z-[1001] flex items-center gap-1 bg-white/95 dark:bg-stone-900/98 backdrop-blur-md p-1 rounded-xl border border-stone-200 dark:border-stone-700/80 shadow-xl">
          <button
            type="button"
            onClick={() => setBasemap("google-hybrid")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              basemap === "google-hybrid"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Google Hybrid
          </button>
          <button
            type="button"
            onClick={() => setBasemap("google-satellite")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              basemap === "google-satellite"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setBasemap("streets")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              basemap === "streets"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            Streets
          </button>
          <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-0.5" />
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all cursor-pointer"
            title="Exit Full Window (Esc)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Exit Full Window</span>
          </button>
        </div>

        {/* Floating Field Details Inspector Card (Matching user design, 100% visible on all viewports) */}
        {inspectedFeature && (
          <div className="absolute top-12 sm:top-14 right-3 sm:right-6 z-[1002] w-76 sm:w-84 max-w-[calc(100vw-24px)] max-h-[calc(100vh-60px)] flex flex-col box-border bg-stone-900/98 backdrop-blur-xl rounded-2xl sm:rounded-3xl border-2 border-emerald-600/40 p-3.5 sm:p-4.5 shadow-2xl space-y-2.5 sm:space-y-3 text-white">
            {/* Header */}
            <div className="relative shrink-0 pr-7">
              <button
                type="button"
                onClick={() => setInspectedFeature(null)}
                className="absolute top-0 right-0 p-1 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors shrink-0 cursor-pointer"
                title="Close parcel detail"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-extrabold text-emerald-400 uppercase tracking-wider block">
                  SELECTED PARCEL DETAIL
                </span>
                {(() => {
                  const present = getPresentCropPrediction(inspectedFeature.properties.monitoring_prediction);
                  if (!present) return null;
                  return (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/80 border border-emerald-500/50 text-emerald-300">
                      Present: {formatCropDisplayName(present.crop_1)}
                    </span>
                  );
                })()}
              </div>
              <h4 className="text-base sm:text-lg font-black text-white mt-0.5 pr-2 truncate">
                {inspectedFeature.properties.farmer_name || inspectedFeature.id}
              </h4>
              <p className="text-[11px] sm:text-xs text-stone-400 font-mono mt-0.5 truncate">
                Plus Code: {inspectedFeature.id}
              </p>
            </div>

            {/* Metrics: Area & Boundary Clarity */}
            <div className="grid grid-cols-2 gap-2 p-2 sm:p-2.5 bg-stone-800/90 border border-stone-700/60 rounded-xl shrink-0">
              <div>
                <span className="text-[11px] font-semibold text-stone-400">Area:</span>
                <div className="font-black text-white text-xs sm:text-sm mt-0.5 whitespace-nowrap">
                  {formatAreaWithHectares(inspectedFeature.properties.area_sq_m, "acre")}
                </div>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-400">Boundary Clarity:</span>
                <div className="font-black text-emerald-400 text-xs sm:text-sm mt-0.5">
                  {(inspectedFeature.properties.class_confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Last Satellite Image Date */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-stone-800/90 border border-stone-700/60 flex items-center justify-between text-xs shrink-0">
              <span className="text-stone-400 flex items-center gap-1.5 font-medium text-[11px]">
                <Satellite className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Last Image Taken:
              </span>
              <span className="font-bold text-emerald-300 font-mono text-[11px] sm:text-xs">
                {inspectedFeature.properties.capture_timestamp_sec
                  ? new Date(inspectedFeature.properties.capture_timestamp_sec * 1000).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : lastCaptureDate}
              </span>
            </div>

            {/* AMED Historical Timeline (Sorted Newest/Present to Oldest) */}
            <div className="space-y-1.5 flex-1 min-h-0">
              <span className="text-[11px] font-bold text-stone-300 uppercase tracking-wider block">
                AMED HISTORICAL TIMELINE
              </span>
              <div className="space-y-1.5 overflow-y-auto max-h-[min(160px,28vh)] pr-1">
                {getSortedPredictions(inspectedFeature.properties.monitoring_prediction).map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-1.5 sm:p-2 rounded-xl bg-stone-800/80 border border-stone-700/50 text-[11px] sm:text-xs"
                  >
                    <span className="font-semibold text-stone-200">
                      {formatSeasonLabel(p, idx === 0)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-white">
                        {formatCropDisplayName(p.crop_1)}
                      </span>
                      <span className="font-mono text-[11px] sm:text-xs font-bold text-emerald-400">
                        ({((p.conf_1 || 0) * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Link: Audit / Verify */}
            <a
              href={actionHref ? `${actionHref}&plots=${inspectedFeature.id}` : "/verify"}
              className="w-full py-2 sm:py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0 mt-0.5"
            >
              <span>Audit This Plot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Compact Floating Bottom Dock (Only when plots are selected) */}
        {showSelectionTray && features && selectedFieldIds.length > 0 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[1001] max-w-[90vw]">
            <SelectedPlotsTray
              allFeatures={features.features}
              selectedFieldIds={selectedFieldIds}
              onToggleField={(f) => handleFieldClickInternal(f)}
              onClearSelection={handleClear}
              onSelectAllVisible={handleSelectAll}
              onActionClick={onActionClick}
              actionLabel={actionLabel}
              actionHref={actionHref}
              compact={true}
            />
          </div>
        )}
      </div>
    );

    if (mounted && typeof document !== "undefined") {
      return createPortal(fullscreenContent, document.body);
    }
    return fullscreenContent;
  }

  // STANDARD MODE (Dashboard Grid Layout)
  return (
    <div className="space-y-3">
      {/* Search Area Bar (if enabled) */}
      {showSearch && (
        <MapAreaSearch
          onSelectArea={handleSelectArea}
          isLoading={isSearchingArea}
        />
      )}

      {/* Main Map Box */}
      <div className={`relative overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm ${className}`}>
        {/* Basemap Switcher & Full Window Controls */}
        <div className="absolute top-3 right-3 z-1000 flex items-center gap-1 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xs p-1 rounded-xl border border-stone-200 dark:border-stone-800 shadow-md">
          <button
            type="button"
            onClick={() => setBasemap("google-hybrid")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              basemap === "google-hybrid"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
            title="Google Satellite with labeled roads and villages"
          >
            <Layers className="w-3.5 h-3.5" />
            Google Hybrid
          </button>
          <button
            type="button"
            onClick={() => setBasemap("google-satellite")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              basemap === "google-satellite"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
            title="Pure Google Satellite imagery"
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setBasemap("streets")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              basemap === "streets"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
            title="OpenStreetMap street view"
          >
            Streets
          </button>

          <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-0.5" />

          {/* Full Window / Maximize Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
            title="Expand to Full Window"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Full Window</span>
          </button>
        </div>

        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
          zoomControl={true}
          minZoom={3}
          maxZoom={22}
          className="h-full w-full"
        >
          <MapRecenter center={activeCenter} />
          <CoordinatesBadge initialCenter={center} />
          <SatelliteCaptureBadge lastCaptureDate={lastCaptureDate} captureDates={captureDates} />
          <BasemapControl basemap={basemap} />
          {onLoadCurrentView && (
            <MapLoadCenterButton onLoad={onLoadCurrentView} />
          )}
          {features && (
            <FieldLayer
              features={features}
              selectedFieldIds={selectedFieldIds}
              onFieldClick={handleFieldClickInternal}
              colorBy={colorBy}
            />
          )}
          <DrawControl
            enableDraw={enableDraw}
            onPolygonDrawn={onPolygonDrawn}
            onPinDropped={onMapClick}
          />
          <MapClickHandler onClick={onMapClick} />
        </MapContainer>
      </div>

      {/* Selected Plots Summary Tray (if enabled) */}
      {showSelectionTray && features && (
        <SelectedPlotsTray
          allFeatures={features.features}
          selectedFieldIds={selectedFieldIds}
          onToggleField={(f) => handleFieldClickInternal(f)}
          onClearSelection={handleClear}
          onSelectAllVisible={handleSelectAll}
          onActionClick={onActionClick}
          actionLabel={actionLabel}
          actionHref={actionHref}
          compact={false}
        />
      )}
    </div>
  );
}
