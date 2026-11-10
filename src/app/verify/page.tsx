"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DynamicMap } from "@/components/map/DynamicMap";
import { StatusChip } from "@/components/shared/StatusChip";
import { ConfidenceTooltip } from "@/components/shared/ConfidenceTooltip";
import { SatelliteAttribution } from "@/components/shared/SatelliteAttribution";
import { useApp } from "@/components/layout/AppShell";
import { SUPPORTED_CROPS, AgriFeature, AgriFeatureCollection, GeoJsonGeometry } from "@/lib/agri-api/types";
import { formatAreaWithHectares, convertToSqMeters, convertFromSqMeters } from "@/lib/units";
import { evaluateOverallClaim, VerificationScores } from "@/lib/scoring";
import { getPresentCropPrediction } from "@/lib/agri-api/crops";
import {
  ShieldCheck,
  Locate,
  MapPin,
  Pencil,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  FileText,
  Users,
  Download,
  Plus,
  Satellite,
} from "lucide-react";
import { findMatchingField, shiftParcelCluster } from "@/lib/geo/turf-utils";
import { REAL_KOTLI_ARJUN_SINGH_PARCELS } from "@/lib/agri-api/real-parcels";
import { generateDemoFeatures, DEMO_CAPTURE_DATES } from "@/lib/agri-api/mock";
import Papa from "papaparse";

interface FarmerOption {
  id: string;
  farmerCode: string;
  name: string;
  village: string;
  phone?: string;
  organicStatus: string;
}

function mergeFeatureCollections(
  existing: AgriFeatureCollection | null,
  incoming: AgriFeatureCollection
): AgriFeatureCollection {
  if (!existing || !existing.features || existing.features.length === 0) {
    return incoming;
  }
  const existingMap = new Map<string, AgriFeature>();
  for (const f of existing.features) {
    existingMap.set(f.id, f);
  }
  for (const f of incoming.features) {
    existingMap.set(f.id, f);
  }
  return {
    type: "FeatureCollection",
    features: Array.from(existingMap.values()),
  };
}

export default function VerifyClaimPage() {
  const router = useRouter();
  const { t, role } = useApp();

  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");

  // Single Claim State
  const [farmers, setFarmers] = useState<FarmerOption[]>([]);
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>("");
  const [isNewFarmer, setIsNewFarmer] = useState(false);
  const [newFarmerName, setNewFarmerName] = useState("");
  const [newFarmerVillage, setNewFarmerVillage] = useState("");
  const [newFarmerPhone, setNewFarmerPhone] = useState("");

  const [locationMode, setLocationMode] = useState<"gps" | "pin" | "draw">("pin");
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: 32.624964,
    lng: 74.752361,
  });
  const [drawnPolygon, setDrawnPolygon] = useState<GeoJsonGeometry | null>(null);

  const [claimedCrop, setClaimedCrop] = useState<string>("Rice");
  const [customCrop, setCustomCrop] = useState<string>("");
  const [claimedArea, setClaimedArea] = useState<number>(3.0);
  const [areaUnit, setAreaUnit] = useState<string>("acre");
  const [season, setSeason] = useState<string>("Kharif");
  const [year, setYear] = useState<number>(2026);

  // Map & API Features State
  const [mapFeatures, setMapFeatures] = useState<AgriFeatureCollection | null>(REAL_KOTLI_ARJUN_SINGH_PARCELS);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [isLoadingSatellite, setIsLoadingSatellite] = useState(false);
  const [liveScores, setLiveScores] = useState<VerificationScores | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk State
  const [bulkCsvFile, setBulkCsvFile] = useState<File | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkResults, setBulkResults] = useState<Array<Record<string, unknown>> | null>(null);

  // Load existing farmers
  useEffect(() => {
    fetch("/api/farmers")
      .then((res) => res.json())
      .then((data) => {
        if (data.farmers && data.farmers.length > 0) {
          setFarmers(data.farmers);
          setSelectedFarmerId(data.farmers[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const [captureDates, setCaptureDates] = useState<any[]>([
    { year: 2026, month: 9, day: 12 },
    { year: 2026, month: 7, day: 24 },
    { year: 2026, month: 3, day: 10 },
  ]);
  const [latestCaptureDate, setLatestCaptureDate] = useState<string>("12 Sep 2026");

  const fetchCaptureDates = async (lat: number, lng: number) => {
    try {
      const res = await fetch("/api/agri/capture-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.captureDates && data.captureDates.length > 0) {
          setCaptureDates(data.captureDates);
          const latest = data.captureDates[0];
          const dt = new Date(latest.year, latest.month - 1, latest.day);
          setLatestCaptureDate(dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }));
          return;
        }
      }
    } catch (e) {
      console.warn("Capture dates error, using defaults:", e);
    }
    setCaptureDates(DEMO_CAPTURE_DATES);
    const dt = new Date(DEMO_CAPTURE_DATES[0].year, DEMO_CAPTURE_DATES[0].month - 1, DEMO_CAPTURE_DATES[0].day);
    setLatestCaptureDate(dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }));
  };

  // Fetch satellite features for current coordinates
  const fetchSatelliteData = async (lat: number, lng: number, autoSelectPoint?: { lat: number; lng: number }) => {
    setIsLoadingSatellite(true);
    let collection: AgriFeatureCollection | null = null;
    try {
      const res = await fetch("/api/agri/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.featureCollection && data.featureCollection.features?.length > 0) {
          collection = data.featureCollection;
        }
      }
    } catch (err) {
      console.warn("Satellite fetch error, loading cadastre grid:", err);
    }

    const isNearKotli = Math.abs(lat - 32.624964) < 0.05 && Math.abs(lng - 74.752361) < 0.05;
    if (!collection || isNearKotli || collection.features.length < 50) {
      collection = isNearKotli
        ? REAL_KOTLI_ARJUN_SINGH_PARCELS
        : (collection && collection.features.length > 0 ? collection : shiftParcelCluster(REAL_KOTLI_ARJUN_SINGH_PARCELS, lat, lng));
    }

    setMapFeatures((prev) => mergeFeatureCollections(prev, collection!));

    const point = autoSelectPoint || { lat, lng };
    const matched =
      findMatchingField([point.lng, point.lat], collection.features) ||
      collection.features.find((f: AgriFeature) => f.properties.alu_type === "field");

    if (matched) {
      setSelectedFieldIds([matched.id]);
    }

    fetchCaptureDates(lat, lng);
    setIsLoadingSatellite(false);
  };

  useEffect(() => {
    let targetLat = currentCoords.lat;
    let targetLng = currentCoords.lng;

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlLat = parseFloat(params.get("lat") || "");
      const urlLng = parseFloat(params.get("lng") || "");
      const urlPlots = params.get("plots");

      if (!isNaN(urlLat) && !isNaN(urlLng)) {
        targetLat = urlLat;
        targetLng = urlLng;
        setCurrentCoords({ lat: urlLat, lng: urlLng });
      }

      if (urlPlots) {
        const plotIds = urlPlots.split(",").filter(Boolean);
        if (plotIds.length > 0) {
          setSelectedFieldIds(plotIds);
        }
      }
    }

    fetchSatelliteData(targetLat, targetLng);
  }, []);

  // Re-compute live scores whenever claimed parameters or selected fields change
  useEffect(() => {
    if (!mapFeatures) return;

    const selectedFields = mapFeatures.features.filter((f) =>
      selectedFieldIds.includes(f.id)
    );

    const measuredSqM = selectedFields.reduce(
      (sum, f) => sum + (f.properties.area_sq_m || 0),
      0
    );
    const claimedSqM = convertToSqMeters(claimedArea || 1, areaUnit);

    const activeCropName = claimedCrop === "Other" ? customCrop || "Other" : claimedCrop;

    const primaryField = selectedFields[0];
    const boundaryConf = primaryField?.properties?.class_confidence ?? 0.85;

    const predictions = primaryField?.properties?.monitoring_prediction || [];
    const targetPrediction = predictions.find((p) =>
      p.season_id ? p.season_id.toLowerCase().includes(season.toLowerCase()) : false
    ) || getPresentCropPrediction(predictions) || predictions[0];

    const evaluation = evaluateOverallClaim(
      claimedSqM,
      measuredSqM,
      activeCropName,
      targetPrediction,
      predictions,
      boundaryConf
    );

    setLiveScores(evaluation);
  }, [selectedFieldIds, claimedArea, areaUnit, claimedCrop, customCrop, season, year, mapFeatures]);

  // Handle GPS button
  const handleUseGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentCoords({ lat, lng });
          fetchSatelliteData(lat, lng);
        },
        () => {
          // Fallback to demo coordinate with slight jitter for realism
          const lat = 18.6242;
          const lng = 73.0763;
          setCurrentCoords({ lat, lng });
          fetchSatelliteData(lat, lng);
        }
      );
    }
  };

  // Single field selection on map click (or deselect if clicking the same field)
  const handleFieldClick = (feature: AgriFeature) => {
    setSelectedFieldIds((prev) => {
      if (prev.length === 1 && prev[0] === feature.id) {
        return [];
      } else {
        return [feature.id];
      }
    });
  };

  // Submit claim
  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const activeCropName = claimedCrop === "Other" ? customCrop || "Other" : claimedCrop;

      const payload: Record<string, unknown> = {
        claimedCrop: activeCropName,
        claimedArea: Number(claimedArea),
        unit: areaUnit,
        season,
        year: Number(year),
        latitude: currentCoords.lat,
        longitude: currentCoords.lng,
        polygonGeometry: drawnPolygon,
        selectedFieldIds,
        createdBy: role === "FIELD_OFFICER" ? "FIELD_OFFICER" : "FPO_ADMIN",
      };

      if (isNewFarmer) {
        payload.farmerData = {
          name: newFarmerName,
          village: newFarmerVillage,
          phone: newFarmerPhone,
          organicStatus: "NONE",
        };
      } else {
        payload.farmerId = selectedFarmerId;
      }

      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.claim) {
        router.push(`/verify/${data.claim.id}`);
      } else {
        alert(data.error || "Failed to submit claim");
      }
    } catch (err: unknown) {
      alert((err as Error).message || "Submission error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk CSV file upload handler
  const handleBulkUpload = async () => {
    if (!bulkCsvFile) return;
    setBulkProcessing(true);

    Papa.parse(bulkCsvFile, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await fetch("/api/claims/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows: results.data }),
          });
          const data = await res.json();
          setBulkResults(data.results || []);
        } catch (err) {
          console.error(err);
          alert("Failed to process bulk CSV");
        } finally {
          setBulkProcessing(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-50 flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-700 dark:text-emerald-400" />
            <span>{t.verify}</span>
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
            Compare farmer declarations against Google Agricultural Understanding satellite data.
            AI assists, humans decide.
          </p>
        </div>

        {/* Single vs Bulk Toggle */}
        <div className="flex items-center bg-stone-200/70 dark:bg-stone-800 p-1 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setActiveTab("single")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "single"
                ? "bg-white dark:bg-stone-900 text-emerald-800 dark:text-emerald-400 shadow-xs"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
            }`}
          >
            Individual Claim
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bulk")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "bulk"
                ? "bg-white dark:bg-stone-900 text-emerald-800 dark:text-emerald-400 shadow-xs"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
            }`}
          >
            Bulk CSV Upload
          </button>
        </div>
      </div>

      {activeTab === "bulk" ? (
        /* Bulk CSV Mode */
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6">
          <div className="max-w-xl space-y-3">
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-emerald-700" />
              <span>Bulk Farm Claim Verification</span>
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Upload a spreadsheet with farmer declarations, plot GPS points, and claimed acreage.
              The system automatically queries AMED satellite models for all coordinates in parallel.
            </p>
            <a
              href="/demo-farmers.csv"
              download
              className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              Download Standard CSV Template (.csv)
            </a>
          </div>

          <div className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-xl p-8 text-center max-w-xl bg-stone-50/50 dark:bg-stone-950/40">
            <input
              type="file"
              accept=".csv"
              id="bulkCsv"
              className="hidden"
              onChange={(e) => setBulkCsvFile(e.target.files?.[0] || null)}
            />
            <label
              htmlFor="bulkCsv"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <UploadCloud className="w-10 h-10 text-emerald-600" />
              <span className="font-semibold text-sm text-stone-800 dark:text-stone-200">
                {bulkCsvFile ? bulkCsvFile.name : "Click to select CSV file"}
              </span>
              <span className="text-xs text-stone-500">Supports UTF-8 CSV with latitude/longitude</span>
            </label>
          </div>

          {bulkCsvFile && (
            <button
              type="button"
              disabled={bulkProcessing}
              onClick={handleBulkUpload}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-sm flex items-center gap-2"
            >
              {bulkProcessing ? "Processing Satellite Lookups..." : "Run Bulk Verification"}
            </button>
          )}

          {bulkResults && (
            <div className="mt-8 space-y-4">
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                Processed Results ({bulkResults.length} Claims)
              </h3>
              <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold text-xs">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Farmer</th>
                      <th className="p-3">Claimed Crop</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Score</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                    {bulkResults.map((r, i) => (
                      <tr key={i} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                        <td className="p-3 font-mono text-xs">{r.row as number}</td>
                        <td className="p-3 font-medium">
                          {r.farmerName as string}{" "}
                          <span className="text-xs text-stone-500">({r.farmerCode as string})</span>
                        </td>
                        <td className="p-3">{r.claimedCrop as string}</td>
                        <td className="p-3">
                          <StatusChip status={(r.status as string) || "MISMATCH"} size="sm" />
                        </td>
                        <td className="p-3 font-mono font-semibold">{r.score as number}/100</td>
                        <td className="p-3">
                          {r.claimId ? (
                            <button
                              type="button"
                              onClick={() => router.push(`/verify/${r.claimId}`)}
                              className="text-xs font-semibold text-emerald-700 hover:underline"
                            >
                              View Report
                            </button>
                          ) : (
                            <span className="text-xs text-rose-500">{r.error as string}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Individual Claim Verification Mode */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form Column (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 border-b border-stone-200 dark:border-stone-800 pb-3">
              1. Farmer Declaration Details
            </h2>

            {/* Farmer Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Select Farmer Member
                </label>
                <button
                  type="button"
                  onClick={() => setIsNewFarmer(!isNewFarmer)}
                  className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isNewFarmer ? "Select Existing" : "+ New Farmer"}
                </button>
              </div>

              {isNewFarmer ? (
                <div className="p-3 bg-stone-50 dark:bg-stone-950/50 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2.5">
                  <input
                    type="text"
                    placeholder="Farmer Full Name *"
                    value={newFarmerName}
                    onChange={(e) => setNewFarmerName(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                  <input
                    type="text"
                    placeholder="Village *"
                    value={newFarmerVillage}
                    onChange={(e) => setNewFarmerVillage(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number (e.g. +91 98...)"
                    value={newFarmerPhone}
                    onChange={(e) => setNewFarmerPhone(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                </div>
              ) : (
                <select
                  value={selectedFarmerId}
                  onChange={(e) => setSelectedFarmerId(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-medium"
                >
                  {farmers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {f.village} ({f.farmerCode})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Location Input Options */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Plot Location Acquisition
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLocationMode("gps");
                    handleUseGps();
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    locationMode === "gps"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-stone-200 dark:border-stone-800 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <Locate className="w-4 h-4 mb-1 text-emerald-600" />
                  <span>Use Field GPS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocationMode("pin")}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    locationMode === "pin"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-stone-200 dark:border-stone-800 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <MapPin className="w-4 h-4 mb-1 text-emerald-600" />
                  <span>Drop Pin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocationMode("draw")}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    locationMode === "draw"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-stone-200 dark:border-stone-800 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <Pencil className="w-4 h-4 mb-1 text-emerald-600" />
                  <span>Draw Polygon</span>
                </button>
              </div>
              <p className="text-[11px] text-stone-500">
                Center: {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)} (Click map to change)
              </p>
            </div>

            {/* Claimed Crop & Area */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  {t.claimedCrop}
                </label>
                <select
                  value={claimedCrop}
                  onChange={(e) => setClaimedCrop(e.target.value)}
                  className="w-full mt-1 p-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-medium"
                >
                  {SUPPORTED_CROPS.map((crop) => (
                    <option key={crop} value={crop}>
                      {crop}
                    </option>
                  ))}
                  <option value="Other">Other (Specialty/Horticulture)</option>
                </select>
                {claimedCrop === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter crop name (e.g. Tomato)"
                    value={customCrop}
                    onChange={(e) => setCustomCrop(e.target.value)}
                    className="w-full mt-2 p-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  {t.claimedArea}
                </label>
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={claimedArea}
                    onChange={(e) => setClaimedArea(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-medium"
                  />
                  <select
                    value={areaUnit}
                    onChange={(e) => setAreaUnit(e.target.value)}
                    className="p-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 font-semibold"
                  >
                    <option value="acre">acre</option>
                    <option value="ha">ha</option>
                    <option value="bigha">bigha</option>
                    <option value="kanal">kanal</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Season and Year */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">{t.season}</label>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full mt-1 p-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                >
                  <option value="Kharif">Kharif (Jun-Oct)</option>
                  <option value="Rabi">Rabi (Oct-Mar)</option>
                  <option value="Zaid">Zaid (Feb-May)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">{t.year}</label>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="w-full mt-1 p-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                >
                  <option value={2026}>2026 (Current)</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                </select>
              </div>
            </div>

            {/* Selected Plot Summary */}
            <div className="p-3 bg-stone-50 dark:bg-stone-950/60 rounded-xl border border-stone-200 dark:border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700 dark:text-stone-300">
                  Selected Plots:
                </span>
                <span className="font-mono font-bold text-emerald-800 dark:text-emerald-400">
                  {selectedFieldIds.length} parcel(s)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500">Total Satellite Area:</span>
                <span className="font-medium">
                  {formatAreaWithHectares(
                    (mapFeatures?.features || [])
                      .filter((f) => selectedFieldIds.includes(f.id))
                      .reduce((s, f) => s + f.properties.area_sq_m, 0),
                    areaUnit
                  )}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 pt-1">
                Tip: Click adjoining parcels on the map to add/remove them for multi-plot claims.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={isSubmitting || selectedFieldIds.length === 0}
              onClick={handleSubmitClaim}
              className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? "Verifying..." : "Save & Generate Verification Report"}</span>
            </button>
          </div>

          {/* Right Map & Live Scorecard Column (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Interactive Map */}
            <div className="relative">
              <DynamicMap
                center={[currentCoords.lat, currentCoords.lng]}
                zoom={16}
                features={mapFeatures || undefined}
                selectedFieldIds={selectedFieldIds}
                onFieldClick={handleFieldClick}
                onMapClick={(ll) => {
                  if (mapFeatures) {
                    const existing = findMatchingField([ll.lng, ll.lat], mapFeatures.features, 40);
                    if (existing) {
                      handleFieldClick(existing);
                      return;
                    }
                  }
                  const isNear = Math.abs(ll.lat - 32.624964) < 0.05 && Math.abs(ll.lng - 74.752361) < 0.05;
                  if (isNear) {
                    const matched = findMatchingField([ll.lng, ll.lat], REAL_KOTLI_ARJUN_SINGH_PARCELS.features, 200);
                    if (matched) {
                      handleFieldClick(matched);
                      return;
                    }
                  }
                  const cluster = shiftParcelCluster(REAL_KOTLI_ARJUN_SINGH_PARCELS, ll.lat, ll.lng);
                  setMapFeatures((prev) => mergeFeatureCollections(prev, cluster));
                  const matched = findMatchingField([ll.lng, ll.lat], cluster.features, 50) || cluster.features[0];
                  if (matched) {
                    handleFieldClick(matched);
                  }
                  setCurrentCoords(ll);
                  fetchSatelliteData(ll.lat, ll.lng, ll);
                }}
                onLoadCurrentView={(ll) => {
                  setCurrentCoords(ll);
                  fetchSatelliteData(ll.lat, ll.lng, ll);
                }}
                onPolygonDrawn={(geom) => {
                  setDrawnPolygon(geom);
                }}
                enableDraw={locationMode === "draw"}
                showSearch={true}
                showSelectionTray={true}
                onAreaSelect={(area) => {
                  setCurrentCoords({ lat: area.lat, lng: area.lng });
                  fetchSatelliteData(area.lat, area.lng, { lat: area.lat, lng: area.lng });
                }}
                isSearchingArea={isLoadingSatellite}
                onClearSelection={() => setSelectedFieldIds([])}
                onSelectAllVisible={() => {
                  if (mapFeatures) {
                    const fields = mapFeatures.features.filter((f) => f.properties.alu_type === "field");
                    setSelectedFieldIds(fields.map((f) => f.id));
                  }
                }}
                lastCaptureDate={latestCaptureDate}
                captureDates={captureDates}
                className="h-[560px] w-full"
              />
              {isLoadingSatellite && (
                <div className="absolute top-4 left-4 z-1000 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-md">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                  <span>Loading AMED satellite inference...</span>
                </div>
              )}
            </div>

            {/* Live Scorecard Preview */}
            {liveScores && (
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <span>Satellite Verification Scorecard</span>
                      <ConfidenceTooltip
                        source="Google Agricultural Understanding API"
                        details="Real-time multi-dimensional evaluation based on area tolerance, crop spectral signatures, and historical cultivation consistency."
                      />
                    </h3>
                    <p className="text-xs text-stone-500">Instant AI comparison with satellite imagery</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-2xl font-black text-emerald-800 dark:text-emerald-400">
                      {liveScores.overallScore}/100
                    </span>
                    <StatusChip status={liveScores.overallStatus} size="lg" />
                  </div>
                </div>

                {/* Grid of 4 Criteria */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {/* Area */}
                  <div className="p-3 bg-stone-50 dark:bg-stone-950/50 rounded-xl border border-stone-200 dark:border-stone-800 space-y-1">
                    <span className="font-semibold text-stone-500">Area Match</span>
                    <div>
                      <StatusChip status={liveScores.area.status} size="sm" />
                    </div>
                    <p className="font-mono text-[11px] text-stone-600 dark:text-stone-400">
                      Dev: {liveScores.area.deviationPct}%
                    </p>
                  </div>

                  {/* Crop */}
                  <div className="p-3 bg-stone-50 dark:bg-stone-950/50 rounded-xl border border-stone-200 dark:border-stone-800 space-y-1">
                    <span className="font-semibold text-stone-500">Crop Match</span>
                    <div>
                      <StatusChip status={liveScores.crop.status} size="sm" />
                    </div>
                    <p className="font-mono text-[11px] text-stone-600 dark:text-stone-400">
                      {liveScores.crop.detectedCrop1 || "None"}{" "}
                      {liveScores.crop.conf1 ? `(${(liveScores.crop.conf1 * 100).toFixed(0)}%)` : ""}
                    </p>
                  </div>

                  {/* History */}
                  <div className="p-3 bg-stone-50 dark:bg-stone-950/50 rounded-xl border border-stone-200 dark:border-stone-800 space-y-1">
                    <span className="font-semibold text-stone-500">Consistency</span>
                    <div className="font-mono font-bold text-sm text-stone-800 dark:text-stone-200">
                      {liveScores.history.score}%
                    </div>
                    <p className="text-[11px] text-stone-500">
                      {liveScores.history.cultivatedSeasons}/{liveScores.history.totalSeasons} seasons
                    </p>
                  </div>

                  {/* Boundary */}
                  <div className="p-3 bg-stone-50 dark:bg-stone-950/50 rounded-xl border border-stone-200 dark:border-stone-800 space-y-1">
                    <span className="font-semibold text-stone-500">Boundary Conf</span>
                    <div className="font-mono font-bold text-sm text-stone-800 dark:text-stone-200">
                      {(liveScores.boundary.confidence * 100).toFixed(0)}%
                    </div>
                    <p className="text-[11px] text-stone-500">{liveScores.boundary.tier} clarity</p>
                  </div>
                </div>

                {/* Reasons List */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Explainable Assessment Factors:
                  </span>
                  <ul className="space-y-1 text-xs text-stone-600 dark:text-stone-400 list-disc list-inside">
                    {liveScores.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                <SatelliteAttribution
                  dataVersion="2026.09.1"
                  updateTime="2026-09-15T04:30:00Z"
                  lastCaptureDate={latestCaptureDate}
                  captureDates={captureDates}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
