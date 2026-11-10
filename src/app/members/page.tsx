"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Upload,
  Download,
  CheckCircle,
  Filter,
  Eye,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import { StatusChip } from "@/components/shared/StatusChip";
import Papa from "papaparse";

export default function MembersRegistryPage() {
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [villageFilter, setVillageFilter] = useState("ALL");
  const [organicFilter, setOrganicFilter] = useState("ALL");

  // CSV Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  const fetchFarmers = () => {
    fetch("/api/farmers")
      .then((res) => res.json())
      .then((data) => {
        if (data.farmers) setFarmers(data.farmers);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  const handleCsvImport = () => {
    if (!importFile) return;
    setImporting(true);

    Papa.parse(importFile, {
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
          setImportFeedback(`Successfully imported ${data.totalProcessed} members and initialized satellite claim audits.`);
          fetchFarmers();
        } catch (err: any) {
          setImportFeedback(`Import error: ${err.message}`);
        } finally {
          setImporting(false);
        }
      },
    });
  };

  const villages = Array.from(new Set(farmers.map((f) => f.village))).filter(Boolean);

  const filteredFarmers = farmers.filter((f) => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase()) && !f.farmerCode.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (villageFilter !== "ALL" && f.village !== villageFilter) return false;
    if (organicFilter !== "ALL" && f.organicStatus !== organicFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-emerald-700 dark:text-emerald-400" />
            <span>Member Farmers & Cadastre Registry</span>
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
            Manage FPO farmers, parcel boundaries, organic certifications, and claim history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/demo-farmers.csv"
            download
            className="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-semibold text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 shadow-2xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Template</span>
          </a>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Member CSV</span>
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="p-6 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-lg space-y-4 max-w-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Bulk Member CSV Import</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowImportModal(false)}
              className="text-stone-400 hover:text-stone-700"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-stone-500">
            Upload a CSV containing farmer_id, name, village, phone, lat, lng, claimed_crop, claimed_area, unit, organic_status.
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            className="w-full text-xs p-2 rounded-xl border border-stone-300 dark:border-stone-700"
          />
          {importFeedback && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl font-medium">
              {importFeedback}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowImportModal(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={importing || !importFile}
              onClick={handleCsvImport}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {importing ? "Importing & Mapping..." : "Start Import"}
            </button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by farmer name or code (e.g. Ramesh, FPO-MH-2026-001)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs"
          />
        </div>

        <select
          value={villageFilter}
          onChange={(e) => setVillageFilter(e.target.value)}
          className="p-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 font-medium"
        >
          <option value="ALL">All Villages</option>
          {villages.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>

        <select
          value={organicFilter}
          onChange={(e) => setOrganicFilter(e.target.value)}
          className="p-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 font-medium"
        >
          <option value="ALL">All Organic Status</option>
          <option value="NPOP">NPOP Certified</option>
          <option value="PGS_INDIA">PGS-India</option>
          <option value="IN_CONVERSION">In-Conversion</option>
          <option value="NONE">Conventional (None)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold text-xs">
              <tr>
                <th className="p-3.5">Farmer Code</th>
                <th className="p-3.5">Name</th>
                <th className="p-3.5">Village</th>
                <th className="p-3.5">Contact</th>
                <th className="p-3.5">Mapped Plots</th>
                <th className="p-3.5">Certification</th>
                <th className="p-3.5">Audit Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {filteredFarmers.map((farmer) => {
                const latestClaim = farmer.claims?.[0];
                return (
                  <tr key={farmer.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="p-3.5 font-mono text-xs font-semibold text-stone-500">
                      {farmer.farmerCode}
                    </td>
                    <td className="p-3.5 font-bold text-stone-900 dark:text-stone-100">
                      {farmer.name}
                    </td>
                    <td className="p-3.5 text-xs text-stone-600 dark:text-stone-400">
                      {farmer.village}
                    </td>
                    <td className="p-3.5 font-mono text-xs text-stone-500">
                      {farmer.phone ? `${farmer.phone.slice(0, 7)}****` : "—"}
                    </td>
                    <td className="p-3.5 font-mono text-xs">
                      {farmer.fields?.length || 1} parcel(s)
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        {farmer.organicStatus}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {latestClaim ? (
                        <StatusChip status={latestClaim.status} size="sm" />
                      ) : (
                        <span className="text-xs text-stone-400">No claims yet</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        href={`/members/${farmer.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
