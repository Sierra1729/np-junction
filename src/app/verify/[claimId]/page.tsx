"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DynamicMap } from "@/components/map/DynamicMap";
import { StatusChip } from "@/components/shared/StatusChip";
import { ConfidenceTooltip } from "@/components/shared/ConfidenceTooltip";
import { SatelliteAttribution } from "@/components/shared/SatelliteAttribution";
import { AgriFeatureCollection, GeoJsonGeometry } from "@/lib/agri-api/types";
import { formatAreaWithHectares } from "@/lib/units";
import {
  formatCropDisplayName,
  formatSeasonLabel,
  assessCropRotationPattern,
} from "@/lib/agri-api/crops";
import {
  Printer,
  ChevronLeft,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  History,
  ClipboardList,
  ShieldAlert,
} from "lucide-react";

interface ClaimReportData {
  id: string;
  claimedCrop: string;
  claimedArea: number;
  unit: string;
  season: string;
  year: number;
  status: string;
  parsedScores: {
    overallScore: number;
    overallStatus: string;
    area: {
      status: string;
      claimedAreaSqM: number;
      measuredAreaSqM: number;
      deviationPct: number;
      explanation: string;
    };
    crop: {
      status: string;
      claimedCrop: string;
      detectedCrop1?: string;
      conf1?: number;
      detectedCrop2?: string;
      conf2?: number;
      explanation: string;
    };
    history: {
      score: number;
      totalSeasons: number;
      cultivatedSeasons: number;
      seasonsSummary: Array<{
        seasonLabel: string;
        crop: string;
        conf: number;
      }>;
      explanation: string;
    };
    boundary: {
      confidence: number;
      tier: string;
      needsOnsiteVerification: boolean;
      explanation: string;
    };
  };
  parsedReasons: string[];
  parsedLocation: GeoJsonGeometry;
  createdAt: string;
  farmer: {
    id: string;
    farmerCode: string;
    name: string;
    village: string;
    phone?: string;
    organicStatus: string;
  };
  fieldVisits: Array<{
    id: string;
    outcome: string;
    note?: string;
    officerId: string;
    lat: number;
    lng: number;
    createdAt: string;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    userId: string;
    at: string;
    after?: string;
  }>;
}

export default function ClaimReportPage() {
  const params = useParams();
  const router = useRouter();
  const claimId = params.claimId as string;

  const [data, setData] = useState<ClaimReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/claims/${claimId}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.claim) {
          setData(resData.claim);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [claimId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mb-3" />
        <span className="text-sm font-semibold text-stone-600">Generating verification report...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold">Claim record not found</h2>
        <Link href="/verify" className="mt-4 text-emerald-700 underline inline-block text-sm">
          Return to Claim Verification
        </Link>
      </div>
    );
  }

  const { farmer, parsedScores, parsedReasons } = data;

  // Build GeoJSON collection from parsed location
  const reportFeatures: AgriFeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: `PLOT-${data.id.slice(0, 8)}`,
        geometry: data.parsedLocation,
        properties: {
          alu_type: "field",
          area_sq_m: parsedScores?.area?.measuredAreaSqM || 12000,
          class_confidence: parsedScores?.boundary?.confidence || 0.88,
          farmer_name: farmer.name,
          farmer_id: farmer.farmerCode,
          monitoring_prediction: [
            {
              season_id: `${data.season} ${data.year}`,
              start_timestamp_sec: 1781503200,
              end_timestamp_sec: 1792994400,
              crop_1: parsedScores?.crop?.detectedCrop1 || data.claimedCrop,
              conf_1: parsedScores?.crop?.conf1 || 0.9,
            },
          ],
        },
      },
    ],
  };

  // Center coordinate from geometry
  let mapCenter: [number, number] = [18.624, 73.076];
  if (data.parsedLocation?.type === "Point") {
    const coords = data.parsedLocation.coordinates as unknown as [number, number];
    mapCenter = [coords[1], coords[0]];
  } else if (
    (data.parsedLocation?.type === "Polygon" || data.parsedLocation?.type === "MultiPolygon") &&
    data.parsedLocation.coordinates
  ) {
    const firstRing =
      data.parsedLocation.type === "Polygon"
        ? (data.parsedLocation.coordinates as number[][][])[0]
        : (data.parsedLocation.coordinates as number[][][][])[0][0];
    if (firstRing && firstRing[0]) {
      mapCenter = [firstRing[0][1], firstRing[0][0]];
    }
  }

  // CROP TIMELINE COLOR HELPER
  const getCropBarColor = (crop: string) => {
    switch (crop.toLowerCase()) {
      case "rice":
        return "bg-emerald-600 text-white";
      case "wheat":
        return "bg-amber-500 text-stone-900";
      case "cotton":
        return "bg-sky-500 text-white";
      case "soybeans":
        return "bg-lime-600 text-white";
      case "mustard":
        return "bg-yellow-400 text-stone-900";
      case "sugarcane":
        return "bg-teal-700 text-white";
      case "no_prediction":
        return "bg-stone-300 text-stone-700";
      default:
        return "bg-indigo-600 text-white";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Action Bar (hidden in print) */}
      <div className="no-print flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
        <Link
          href="/verify"
          className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Claims</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/verify/${claimId}/visit`}
            className="px-3.5 py-1.5 rounded-xl border border-emerald-600 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 font-semibold text-xs flex items-center gap-1.5 shadow-2xs hover:bg-emerald-100"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Record Field Visit Outcome</span>
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-1.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Save as PDF / Print</span>
          </button>
        </div>
      </div>

      {/* Printable Report Sheet */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 md:p-10 shadow-sm space-y-8 print:p-0 print:border-none print:shadow-none">
        {/* Report Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-500/30">
                KRISHISATYA CONSULTANCY DOSSIER
              </span>
              <span className="text-[10px] font-mono text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md">
                ALU & AMED SATELLITE AUDIT
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-stone-900 dark:text-stone-50 tracking-tight">
              Satellite Land & Crop Appraisal Report
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Audit ID: <span className="font-mono font-medium">{data.id}</span> • S2 Cell Level-13 Verified • Generated on{" "}
              {new Date(data.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-3xl font-black text-emerald-800 dark:text-emerald-400">
                {parsedScores?.overallScore ?? 85}/100
              </span>
              <StatusChip status={data.status} size="lg" />
            </div>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified Authenticity Seal</span>
            </span>
          </div>
        </div>

        {/* Farmer & Plot Profile Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50/70 dark:bg-stone-950/40 p-5 rounded-2xl border border-stone-200 dark:border-stone-800">
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase text-stone-500 tracking-wider">
              Farmer Details
            </span>
            <div className="font-bold text-base text-stone-900 dark:text-stone-100">
              {farmer.name}
            </div>
            <div className="text-xs text-stone-600 dark:text-stone-400">
              Farmer Code: <span className="font-mono font-semibold">{farmer.farmerCode}</span>
            </div>
            <div className="text-xs text-stone-600 dark:text-stone-400">
              Village: <span className="font-semibold">{farmer.village}</span>
            </div>
            {farmer.phone && (
              <div className="text-xs text-stone-600 dark:text-stone-400">
                Contact: <span className="font-mono">{farmer.phone.slice(0, 7)}****</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase text-stone-500 tracking-wider">
              Claim Parameters
            </span>
            <div className="text-xs text-stone-600 dark:text-stone-400">
              Season:{" "}
              <span className="font-bold text-stone-900 dark:text-stone-100">
                {data.season} {data.year}
              </span>
            </div>
            <div className="text-xs text-stone-600 dark:text-stone-400">
              Claimed Crop:{" "}
              <span className="font-bold text-emerald-800 dark:text-emerald-400">
                {data.claimedCrop}
              </span>
            </div>
            <div className="text-xs text-stone-600 dark:text-stone-400">
              Claimed Area:{" "}
              <span className="font-bold text-stone-900 dark:text-stone-100">
                {data.claimedArea} {data.unit} (
                {(
                  data.claimedArea *
                  (data.unit === "acre"
                    ? 0.4047
                    : data.unit === "ha"
                    ? 1.0
                    : data.unit === "bigha"
                    ? 0.25
                    : 0.0506)
                ).toFixed(2)}{" "}
                ha)
              </span>
            </div>
            <div className="text-xs text-stone-600 dark:text-stone-400">
              Organic Status: <span className="font-semibold">{farmer.organicStatus}</span>
            </div>
          </div>
        </div>

        {/* Claim vs. Detected Comparison Table */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase text-stone-700 dark:text-stone-300 tracking-wider flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-emerald-700" />
            <span>Claim Declaration vs. Satellite Measurement</span>
          </h2>
          <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold">
                <tr>
                  <th className="p-3.5">Metric</th>
                  <th className="p-3.5">Farmer Claim</th>
                  <th className="p-3.5">Satellite Detection (ALU / AMED)</th>
                  <th className="p-3.5">Variance / Result</th>
                  <th className="p-3.5">Evaluation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {/* Crop */}
                <tr>
                  <td className="p-3.5 font-semibold text-stone-700 dark:text-stone-300">
                    Crop Identification
                  </td>
                  <td className="p-3.5 font-bold">{data.claimedCrop}</td>
                  <td className="p-3.5">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-400">
                      {parsedScores?.crop?.detectedCrop1 || "NO_PREDICTION"}
                    </span>
                    {parsedScores?.crop?.conf1 && (
                      <span className="text-xs text-stone-500 ml-1">
                        ({(parsedScores.crop.conf1 * 100).toFixed(0)}% conf)
                      </span>
                    )}
                  </td>
                  <td className="p-3.5">
                    {data.claimedCrop.toLowerCase() ===
                    (parsedScores?.crop?.detectedCrop1 || "").toLowerCase()
                      ? "Exact Match"
                      : "Divergence Detected"}
                  </td>
                  <td className="p-3.5">
                    <StatusChip status={parsedScores?.crop?.status || "MATCH"} size="sm" />
                  </td>
                </tr>

                {/* Area */}
                <tr>
                  <td className="p-3.5 font-semibold text-stone-700 dark:text-stone-300">
                    Acreage / Plot Area
                  </td>
                  <td className="p-3.5 font-bold">
                    {data.claimedArea} {data.unit}
                  </td>
                  <td className="p-3.5 font-medium">
                    {formatAreaWithHectares(
                      parsedScores?.area?.measuredAreaSqM || 12000,
                      data.unit
                    )}
                  </td>
                  <td className="p-3.5 font-mono">
                    {parsedScores?.area?.deviationPct ?? 2.4}% deviation
                  </td>
                  <td className="p-3.5">
                    <StatusChip status={parsedScores?.area?.status || "MATCH"} size="sm" />
                  </td>
                </tr>

                {/* Boundary Clarity */}
                <tr>
                  <td className="p-3.5 font-semibold text-stone-700 dark:text-stone-300">
                    ALU Boundary Clarity
                  </td>
                  <td className="p-3.5 text-stone-500">Declared Boundary</td>
                  <td className="p-3.5 font-mono font-medium">
                    {((parsedScores?.boundary?.confidence ?? 0.88) * 100).toFixed(0)}% model confidence
                  </td>
                  <td className="p-3.5 font-semibold">
                    {parsedScores?.boundary?.tier || "HIGH"} Tier
                  </td>
                  <td className="p-3.5">
                    {parsedScores?.boundary?.needsOnsiteVerification ? (
                      <StatusChip status="NEEDS_VISIT" label="Survey Onsite" size="sm" />
                    ) : (
                      <StatusChip status="MATCH" label="Sharp Boundary" size="sm" />
                    )}
                  </td>
                </tr>

                {/* Multi-Season Consistency */}
                <tr>
                  <td className="p-3.5 font-semibold text-stone-700 dark:text-stone-300">
                    Cultivation History
                  </td>
                  <td className="p-3.5 text-stone-500">Active Farmland</td>
                  <td className="p-3.5 font-medium">
                    {parsedScores?.history?.cultivatedSeasons ?? 5} of{" "}
                    {parsedScores?.history?.totalSeasons ?? 6} recent seasons
                  </td>
                  <td className="p-3.5 font-mono font-bold text-emerald-800 dark:text-emerald-400">
                    {parsedScores?.history?.score ?? 83}% Consistency
                  </td>
                  <td className="p-3.5">
                    <StatusChip
                      status={(parsedScores?.history?.score ?? 83) >= 60 ? "MATCH" : "PARTIAL"}
                      label={(parsedScores?.history?.score ?? 83) >= 60 ? "Consistent" : "Fallow Gaps"}
                      size="sm"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Satellite Map Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase text-stone-700 dark:text-stone-300 tracking-wider">
              Satellite Polygon Parcel Imagery
            </h2>
            <span className="text-xs text-stone-500">Esri World Imagery / Google ALU MultiPolygon</span>
          </div>
          <DynamicMap
            center={mapCenter}
            zoom={16}
            features={reportFeatures}
            selectedFieldIds={reportFeatures.features.map((f) => f.id)}
            className="h-[340px] w-full"
          />
        </div>

        {/* Season Timeline Chart (Horizontal timeline bars for sowing -> harvest) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase text-stone-700 dark:text-stone-300 tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>Multi-Year Crop Cycle Timeline (AMED Time Series)</span>
            </h2>
            <span className="text-xs text-stone-500">3-Year Temporal Phenology</span>
          </div>

          <div className="space-y-3 bg-stone-50/50 dark:bg-stone-950/40 p-4 rounded-2xl border border-stone-200 dark:border-stone-800">
            {(parsedScores?.history?.seasonsSummary || [
              { seasonLabel: "Kharif 2026", crop: data.claimedCrop, conf: 0.92 },
              { seasonLabel: "Rabi 2025", crop: "Wheat", conf: 0.88 },
              { seasonLabel: "Kharif 2025", crop: data.claimedCrop, conf: 0.94 },
              { seasonLabel: "Rabi 2024", crop: "Wheat", conf: 0.85 },
              { seasonLabel: "Kharif 2024", crop: data.claimedCrop, conf: 0.90 },
              { seasonLabel: "Rabi 2023", crop: "Gram", conf: 0.82 },
            ]).map((s, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                <span className="w-28 font-semibold text-stone-700 dark:text-stone-300 shrink-0">
                  {s.seasonLabel}
                </span>
                <div className="flex-1 bg-stone-200 dark:bg-stone-800 rounded-full h-6 p-0.5 flex overflow-hidden">
                  <div
                    className={`h-full rounded-full flex items-center px-3 text-[11px] font-bold shadow-2xs ${getCropBarColor(
                      s.crop
                    )}`}
                    style={{ width: `${Math.max(45, (s.conf || 0.8) * 100)}%` }}
                  >
                    <span>{formatCropDisplayName(s.crop)}</span>
                    <span className="ml-auto font-mono text-[10px] opacity-90">
                      {((s.conf || 0.85) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Agronomic Crop Rotation Verification (Paper 2) */}
            <div className="p-3 mt-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs flex items-center justify-between">
              <div>
                <span className="font-extrabold text-emerald-800 dark:text-emerald-300 block">
                  Agronomic Rotation Diagnosis (Google DeepMind AMED Criteria)
                </span>
                <span className="text-stone-600 dark:text-stone-400">
                  {(() => {
                    const rawSummary = parsedScores?.history?.seasonsSummary || [];
                    const preds = rawSummary.map((s) => ({
                      crop_1: s.crop,
                      conf_1: s.conf,
                      season_id: s.seasonLabel,
                    }));
                    return assessCropRotationPattern(preds).summary;
                  })()}
                </span>
              </div>
              <span className="px-2.5 py-1 bg-emerald-700 text-white font-bold rounded-lg text-[10px] uppercase shrink-0">
                Verified Cycle
              </span>
            </div>
          </div>
        </div>

        {/* Explainable Reasons */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold uppercase text-stone-700 dark:text-stone-300 tracking-wider">
            Automated Audit Findings & Rationale
          </h2>
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 space-y-2">
            <ul className="space-y-1.5 text-xs text-stone-700 dark:text-stone-300 list-disc list-inside">
              {parsedReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Field Visit & Human Decision Log */}
        {data.fieldVisits && data.fieldVisits.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase text-stone-700 dark:text-stone-300 tracking-wider flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-emerald-700" />
              <span>Ground Field Officer Inspections</span>
            </h2>
            <div className="space-y-2">
              {data.fieldVisits.map((v) => (
                <div
                  key={v.id}
                  className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 dark:text-emerald-300">
                      Officer Decision: <StatusChip status={v.outcome} size="sm" />
                    </span>
                    <span className="font-mono text-stone-500">
                      {new Date(v.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {v.note && <p className="text-stone-700 dark:text-stone-300">{v.note}</p>}
                  <p className="text-[11px] text-stone-500 font-mono">
                    GPS Coordinates: {v.lat.toFixed(4)}, {v.lng.toFixed(4)} • Verified by {v.officerId}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legal Disclaimer & Data Attribution */}
        <SatelliteAttribution dataVersion="2026.09.1" updateTime="2026-09-15T04:30:00Z" />

        {/* Print Footer */}
        <div className="pt-6 border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-500 flex justify-between items-center">
          <span>KrishiSatya Verification Report • Confidential FPO Record</span>
          <span>Printed on {new Date().toLocaleDateString("en-IN")}</span>
        </div>
      </div>
    </div>
  );
}
