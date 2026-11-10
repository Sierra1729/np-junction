"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, QrCode, Plus, CheckCircle, Download, ExternalLink } from "lucide-react";
import { SUPPORTED_CROPS, AgriFeature } from "@/lib/agri-api/types";
import { formatAreaWithHectares } from "@/lib/units";

export default function NewLotPage() {
  const router = useRouter();

  const [crop, setCrop] = useState("Rice");
  const [quantityKg, setQuantityKg] = useState<number>(5000);
  const [harvestDate, setHarvestDate] = useState("2026-10-25");
  const [certificationType, setCertificationType] = useState("NPOP");
  const [certificateUrl, setCertificateUrl] = useState("https://apeda.gov.in/apedawebsite/organic/organic_products.htm");

  const [availableFields, setAvailableFields] = useState<AgriFeature[]>([]);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/agri/monitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: 18.624, longitude: 73.076 }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.featureCollection) {
          const fields = data.featureCollection.features.filter(
            (f: AgriFeature) => f.properties.alu_type === "field"
          );
          setAvailableFields(fields);
          if (fields.length >= 2) {
            setSelectedFieldIds([fields[0].id, fields[1].id]);
          }
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop,
          quantityKg: Number(quantityKg),
          harvestDate,
          certificationType,
          certificateUrl,
          fieldIds: selectedFieldIds,
        }),
      });

      const data = await res.json();
      if (data.lot) {
        setCreatedResult(data);
      } else {
        alert(data.error || "Failed to create lot");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create lot");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleField = (id: string) => {
    setSelectedFieldIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link
        href="/lots"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Produce Lots</span>
      </Link>

      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-emerald-700" />
            <span>Create Organic Produce Batch</span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
            Aggregate harvested plots into a single dispatch batch with cryptographic satellite traceability.
          </p>
        </div>

        {createdResult ? (
          /* Success Screen with QR Preview */
          <div className="p-6 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-3xl border border-emerald-300 dark:border-emerald-700 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
              <CheckCircle className="w-6 h-6" />
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Batch Successfully Created & Signed
              </span>
              <h3 className="text-xl font-mono font-black text-stone-900 dark:text-stone-100 mt-1">
                {createdResult.lot.lotCode}
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                {createdResult.lot.crop} • {createdResult.lot.quantityKg.toLocaleString()} kg •{" "}
                {createdResult.lot.certificationType}
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-stone-200 inline-block shadow-inner mx-auto">
              <img
                src={createdResult.qrDataUrl}
                alt="Lot QR"
                className="w-48 h-48 mx-auto object-contain"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <a
                href={createdResult.qrDataUrl}
                download={`${createdResult.lot.lotCode}-QR.png`}
                className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download QR Code (PNG)</span>
              </a>
              <Link
                href={`/trace/${createdResult.lot.lotCode}`}
                target="_blank"
                className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span>View Public Trace Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          /* Creation Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Crop Type *
                </label>
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="w-full mt-1 p-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-medium"
                >
                  {SUPPORTED_CROPS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Quantity (Kilograms) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantityKg}
                  onChange={(e) => setQuantityKg(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 p-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Harvest Date *
                </label>
                <input
                  type="date"
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                  className="w-full mt-1 p-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Organic Certification Type
                </label>
                <select
                  value={certificationType}
                  onChange={(e) => setCertificationType(e.target.value)}
                  className="w-full mt-1 p-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-medium"
                >
                  <option value="NPOP">NPOP (National Programme for Organic Production)</option>
                  <option value="PGS_INDIA">PGS-India (Participatory Guarantee System)</option>
                  <option value="IN_CONVERSION">In-Conversion (Year 1/2)</option>
                  <option value="NONE">Conventional (None)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Official Certification Document URL
              </label>
              <input
                type="url"
                value={certificateUrl}
                onChange={(e) => setCertificateUrl(e.target.value)}
                placeholder="https://apeda.gov.in/..."
                className="w-full mt-1 p-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-medium"
              />
            </div>

            {/* Select Sourced Plots */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Select Sourced Farmland Parcels ({selectedFieldIds.length} selected)
                </label>
                <span className="text-[11px] text-stone-500">From satellite cadastre</span>
              </div>

              <div className="max-h-52 overflow-y-auto border border-stone-200 dark:border-stone-800 rounded-2xl p-2 divide-y divide-stone-100 dark:divide-stone-800 bg-stone-50/50 dark:bg-stone-950/40">
                {availableFields.map((f) => {
                  const isChecked = selectedFieldIds.includes(f.id);
                  return (
                    <label
                      key={f.id}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800/60 cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleField(f.id)}
                          className="rounded text-emerald-700 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                            {f.id}
                          </span>
                          <span className="text-stone-500 ml-2">
                            {formatAreaWithHectares(f.properties.area_sq_m, "acre")}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700">
                        {(f.properties.class_confidence * 100).toFixed(0)}% ALU Conf
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || selectedFieldIds.length === 0}
              className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Generating QR Lot..." : "Generate Traceable Lot & QR Code"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
