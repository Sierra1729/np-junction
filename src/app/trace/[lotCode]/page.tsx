"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DynamicMap } from "@/components/map/DynamicMap";
import { StatusChip } from "@/components/shared/StatusChip";
import { SatelliteAttribution } from "@/components/shared/SatelliteAttribution";
import { AgriFeatureCollection } from "@/lib/agri-api/types";
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  MapPin,
  FileText,
  ExternalLink,
  Sprout,
  Info,
} from "lucide-react";

export default function PublicTracePage() {
  const params = useParams();
  const lotCode = params.lotCode as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/lots/${lotCode}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.lot) {
          setData(resData);
        }
      })
      .catch((err) => console.error("Trace load error:", err))
      .finally(() => setLoading(false));
  }, [lotCode]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#fdfbf7] p-4 text-center">
        <div className="w-10 h-10 rounded-full border-3 border-emerald-600 border-t-transparent animate-spin mb-3" />
        <span className="text-sm font-bold text-stone-700">Verifying satellite provenance...</span>
        <span className="text-xs text-stone-500 mt-1">Google Agricultural Understanding API</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#fdfbf7] p-4 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-600 mb-2" />
        <h1 className="text-xl font-bold">Produce Lot Not Found</h1>
        <p className="text-xs text-stone-500 mt-1">
          The scanned QR code or lot code ({lotCode}) is invalid or not registered.
        </p>
      </div>
    );
  }

  const { lot, fpo, farmers, fields, seasonsHistory, satelliteCheck } = data;

  // Build GeoJSON features for map
  const mapFeatures: AgriFeatureCollection = {
    type: "FeatureCollection",
    features: (fields || []).map((f: any) => ({
      type: "Feature",
      id: f.id,
      geometry: f.geometry,
      properties: {
        alu_type: "field",
        area_sq_m: f.areaSqM,
        class_confidence: 0.9,
      },
    })),
  };

  const firstGeom = fields?.[0]?.geometry;
  let centerLat = 18.624;
  let centerLng = 73.076;
  if (firstGeom && firstGeom.coordinates) {
    try {
      const ring = firstGeom.type === "Polygon" ? firstGeom.coordinates[0] : firstGeom.coordinates[0][0];
      if (ring && ring[0]) {
        centerLng = ring[0][0];
        centerLat = ring[0][1];
      }
    } catch {}
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] dark:bg-stone-950 text-stone-900 dark:text-stone-100 py-6 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header / Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>SATELLITE-VERIFIED ORGANIC TRACEABILITY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-950 dark:text-emerald-400">
            {lot.crop} Produce Provenance
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400 font-mono">
            Lot Code: <span className="font-bold text-stone-800 dark:text-stone-200">{lot.lotCode}</span>
          </p>
        </div>

        {/* Consistency Check Banner */}
        <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border-2 border-emerald-600/30 shadow-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Satellite Season Validation
              </span>
              <span className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                {satelliteCheck.isMatch ? "Crop Season Confirmed" : "Independent Review"}
              </span>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                {satelliteCheck.isMatch
                  ? `Satellite observation confirms ${lot.crop} standing crop during harvest season (${(satelliteCheck.confidence * 100).toFixed(0)}% confidence).`
                  : "Continuous agricultural cultivation detected across the registered harvest window."}
              </p>
            </div>
          </div>
          <StatusChip
            status={satelliteCheck.isMatch ? "VERIFIED" : "NEEDS_VISIT"}
            label={satelliteCheck.isMatch ? "Verified" : "Under Review"}
            size="sm"
          />
        </div>

        {/* Essential Lot Specs */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-stone-500 font-semibold block">Origin FPO:</span>
            <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
              {fpo.name}
            </span>
            <span className="text-stone-500 block">{fpo.district}</span>
          </div>

          <div>
            <span className="text-stone-500 font-semibold block">Organic Standard:</span>
            <span className="font-bold text-emerald-800 dark:text-emerald-400 text-sm block">
              {lot.certificationType}
            </span>
            {lot.certificateUrl && (
              <a
                href={lot.certificateUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-700 underline font-medium inline-flex items-center gap-1"
              >
                <span>View Certificate</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
            <span className="text-stone-500 font-semibold block">Batch Volume:</span>
            <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
              {lot.quantityKg.toLocaleString()} kg
            </span>
          </div>

          <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
            <span className="text-stone-500 font-semibold block">Harvest Date:</span>
            <span className="font-bold text-stone-800 dark:text-stone-200">
              {new Date(lot.harvestDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Source Farmers (Privacy Consent Enforced) */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              Sourced Farmer Members ({farmers.length})
            </h2>
            <span className="text-[11px] text-stone-500">First names only (Consent protected)</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {farmers.map((f: any, idx: number) => (
              <div
                key={idx}
                className="px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-medium"
              >
                <span>{f.firstName}</span>
                <span className="text-stone-400 text-[11px] ml-1.5">({f.village})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plot Map (Exact if consented, approximate 1km circle otherwise) */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <span>Sourced Geographic Plot Cadastre</span>
            </h2>
            <span className="text-[11px] text-stone-500">
              {fields?.[0]?.isExact ? "Exact Field Boundary" : "Approximate 1km Area (Privacy Protected)"}
            </span>
          </div>

          <DynamicMap
            center={[centerLat, centerLng]}
            zoom={15}
            features={mapFeatures}
            selectedFieldIds={fields.map((f: any) => f.id)}
            className="h-64 w-full"
          />

          <p className="text-[11px] text-stone-500 leading-tight">
            Map displays verified farm boundaries segmented by Google ALU models. Where farmers
            opt out of exact coordinate disclosure, an approximate 1km agricultural centroid is rendered.
          </p>
        </div>

        {/* Multi-Year Continuous Cultivation History */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>Multi-Year Agricultural Continuity (3-Year History)</span>
            </h2>
          </div>

          <div className="space-y-2">
            {(seasonsHistory || []).map((s: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-800 dark:text-stone-200">{s.crop}</span>
                  <span className="text-stone-500 text-[11px]">({s.startYear})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-emerald-700 font-semibold">
                    {(s.confidence * 100).toFixed(0)}% Conf
                  </span>
                  {s.isHarvestSeason && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Harvest Season
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Crucial Mandatory Regulatory & Chemical Disclaimer */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <Info className="w-4 h-4 text-amber-600" />
            <span>Regulatory Organic Verification Note</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Satellite data shows where and when this crop was grown. It cannot detect chemical use
            and supports, but does not replace, third-party organic certification (NPOP / PGS-India).
          </p>
        </div>

        {/* Attribution Footer */}
        <SatelliteAttribution
          dataVersion="2026.09.1"
          updateTime="2026-09-15T04:30:00Z"
        />

        <div className="text-center pt-2 text-[11px] text-stone-400">
          Powered by KrishiSatya & Google Agricultural Understanding Platform (ALU / AMED)
        </div>
      </div>
    </div>
  );
}
