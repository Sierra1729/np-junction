"use client";

import React, { useState } from "react";
import {
  CalendarDays,
  Printer,
  FileSpreadsheet,
  TrendingUp,
  Download,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { SatelliteAttribution } from "@/components/shared/SatelliteAttribution";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// 12-week stacked timeline data (tonnes expected per crop)
const HARVEST_TIMELINE_DATA = [
  { week: "W1 (Oct 20)", Rice: 32, Soybeans: 18, Corn: 0, Cotton: 0 },
  { week: "W2 (Oct 27)", Rice: 48, Soybeans: 24, Corn: 12, Cotton: 0 },
  { week: "W3 (Nov 03)", Rice: 56, Soybeans: 15, Corn: 18, Cotton: 8 },
  { week: "W4 (Nov 10)", Rice: 40, Soybeans: 0, Corn: 22, Cotton: 14 },
  { week: "W5 (Nov 17)", Rice: 25, Soybeans: 0, Corn: 16, Cotton: 20 },
  { week: "W6 (Nov 24)", Rice: 10, Soybeans: 0, Corn: 8, Cotton: 28 },
  { week: "W7 (Dec 01)", Rice: 0, Soybeans: 0, Corn: 0, Cotton: 32 },
  { week: "W8 (Dec 08)", Rice: 0, Soybeans: 0, Corn: 0, Cotton: 26 },
  { week: "W9 (Dec 15)", Rice: 0, Soybeans: 0, Corn: 0, Cotton: 18 },
  { week: "W10 (Dec 22)", Rice: 0, Soybeans: 0, Corn: 0, Cotton: 12 },
  { week: "W11 (Dec 29)", Rice: 0, Soybeans: 0, Corn: 0, Cotton: 6 },
  { week: "W12 (Jan 05)", Rice: 0, Soybeans: 0, Corn: 0, Cotton: 0 },
];

const HARVEST_SUMMARY_TABLE = [
  {
    crop: "Rice (Basmati & Indrayani)",
    fields: 16,
    areaHa: 22.4,
    expectedTons: 62.7,
    harvestWindow: "20 Oct 2026 – 20 Nov 2026",
    verifiedPct: 92,
  },
  {
    crop: "Soybeans (JS-335)",
    fields: 8,
    areaHa: 11.2,
    expectedTons: 12.3,
    harvestWindow: "15 Oct 2026 – 05 Nov 2026",
    verifiedPct: 88,
  },
  {
    crop: "Cotton (Lint)",
    fields: 10,
    areaHa: 14.5,
    expectedTons: 6.5,
    harvestWindow: "05 Nov 2026 – 30 Dec 2026",
    verifiedPct: 85,
  },
  {
    crop: "Corn (Maize)",
    fields: 6,
    areaHa: 8.6,
    expectedTons: 28.4,
    harvestWindow: "25 Oct 2026 – 25 Nov 2026",
    verifiedPct: 90,
  },
  {
    crop: "Sugarcane",
    fields: 4,
    areaHa: 6.0,
    expectedTons: 480.0,
    harvestWindow: "15 Jan 2027 – 15 Mar 2027",
    verifiedPct: 95,
  },
];

export default function HarvestPlannerPage() {
  const [activeTab, setActiveTab] = useState<"calendar" | "supply_sheet">("calendar");

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-emerald-700 dark:text-emerald-400" />
            <span>Harvest Planner & Supply Sheet</span>
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
            Projection models derived from AMED season end dates, local yield benchmarks, and satellite-verified area.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex items-center bg-stone-200/70 dark:bg-stone-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("calendar")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "calendar"
                  ? "bg-white dark:bg-stone-900 text-emerald-800 dark:text-emerald-400 shadow-xs"
                  : "text-stone-600 dark:text-stone-400"
              }`}
            >
              12-Week Calendar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("supply_sheet")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "supply_sheet"
                  ? "bg-white dark:bg-stone-900 text-emerald-800 dark:text-emerald-400 shadow-xs"
                  : "text-stone-600 dark:text-stone-400"
              }`}
            >
              Buyer Supply Sheet
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {activeTab === "calendar" ? (
        /* 12-Week Harvest Calendar Tab */
        <div className="space-y-6">
          {/* Weekly Stacked Bar Chart */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                  <span>Expected Harvest Volume by Week (Tonnes)</span>
                </h2>
                <p className="text-xs text-stone-500">
                  Calculated from AMED crop duration signatures and district yield tables
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={HARVEST_TIMELINE_DATA}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Rice" stackId="a" fill="#22c55e" />
                  <Bar dataKey="Soybeans" stackId="a" fill="#84cc16" />
                  <Bar dataKey="Corn" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="Cotton" stackId="a" fill="#38bdf8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Harvest Table */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Procurement & Harvest Windows
            </h2>

            <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold text-xs">
                  <tr>
                    <th className="p-3.5">Crop</th>
                    <th className="p-3.5">Plots Count</th>
                    <th className="p-3.5">Verified Area</th>
                    <th className="p-3.5">Projected Yield</th>
                    <th className="p-3.5">Harvest Window</th>
                    <th className="p-3.5">Verification Integrity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {HARVEST_SUMMARY_TABLE.map((item) => (
                    <tr key={item.crop} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                      <td className="p-3.5 font-bold text-stone-900 dark:text-stone-100">
                        {item.crop}
                      </td>
                      <td className="p-3.5 font-mono">{item.fields} fields</td>
                      <td className="p-3.5 font-medium">{item.areaHa} ha</td>
                      <td className="p-3.5 font-mono font-bold text-emerald-800 dark:text-emerald-400">
                        {item.expectedTons} tonnes
                      </td>
                      <td className="p-3.5 text-xs text-stone-600 dark:text-stone-400">
                        {item.harvestWindow}
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {item.verifiedPct}% Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Buyer-Facing Supply Sheet (One-Pager, No PII) */
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 md:p-12 shadow-sm space-y-8 print:p-0 print:border-none print:shadow-none">
          {/* Header */}
          <div className="border-b border-stone-200 dark:border-stone-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 mb-2">
                OFFICIAL BUYER SUPPLY SHEET • SATELLITE AUDITED
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-stone-900 dark:text-stone-50 tracking-tight">
                Sahyadri Agro Producer Co. Ltd.
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                District: Pune, Maharashtra • Aggregated FPO Member Supply Commitment
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-stone-500 block">Season Cycle:</span>
              <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Kharif 2026 & Rabi 2026-27
              </span>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>
                <strong>Confidential Commercial Sheet:</strong> Contains aggregated volumes with zero personal farmer PII. Ready for corporate buyers and institutional procurement.
              </span>
            </span>
            <span className="font-mono text-[11px] text-stone-500">Data Freshness: 15 Sep 2026</span>
          </div>

          {/* Aggregated Supply Commitment Table */}
          <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">Commodity / Crop</th>
                  <th className="p-4">Audited Area (ha)</th>
                  <th className="p-4">Committed Volume (Tonnes)</th>
                  <th className="p-4">Availability Window</th>
                  <th className="p-4">Satellite Verified Area</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {HARVEST_SUMMARY_TABLE.map((row) => (
                  <tr key={row.crop} className="hover:bg-stone-50/50">
                    <td className="p-4 font-bold text-stone-900 dark:text-stone-100">
                      {row.crop}
                    </td>
                    <td className="p-4 font-medium">{row.areaHa} ha</td>
                    <td className="p-4 font-mono font-black text-emerald-800 dark:text-emerald-400 text-base">
                      {row.expectedTons} t
                    </td>
                    <td className="p-4 text-xs font-medium text-stone-600 dark:text-stone-400">
                      {row.harvestWindow}
                    </td>
                    <td className="p-4 font-semibold text-emerald-700 text-xs">
                      {row.verifiedPct}% satellite confirmed
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Terms & Verification Disclaimer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs text-stone-600 dark:text-stone-400">
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800 space-y-1">
              <span className="font-bold text-stone-800 dark:text-stone-200 block">
                Procurement Terms & Delivery
              </span>
              <p>
                All produce is sourced directly from verified farmer members of Sahyadri Agro FPO.
                Quality testing at collection center gates. Batch-level traceability QR code included
                with every dispatch dispatch order.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800 space-y-1">
              <span className="font-bold text-stone-800 dark:text-stone-200 block">
                Verification Methodology
              </span>
              <p>
                Acreage and crop classification validated via Google Agricultural Understanding API
                (ALU boundary segmentation and AMED multi-spectral temporal classification).
              </p>
            </div>
          </div>

          <SatelliteAttribution dataVersion="2026.09.1" updateTime="2026-09-15T04:30:00Z" />
        </div>
      )}
    </div>
  );
}
