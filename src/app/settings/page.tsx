"use client";

import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Save,
  Activity,
  ShieldCheck,
  Layers,
  Database,
  CheckCircle,
  AlertTriangle,
  Radio,
} from "lucide-react";
import { DemoBadge } from "@/components/shared/DemoBadge";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testingApi, setTestingApi] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<any>({
    dataMode: "mock",
    hasApiKey: false,
    thresholds: {
      areaMatchPct: 10,
      areaPartialPct: 25,
      cropStrongConf: 0.7,
      cropProbableConf: 0.5,
      historyConsistencyMin: 60,
      boundaryHighConf: 0.9,
      boundaryMedConf: 0.75,
      historyYears: 3,
    },
    unitConfig: {
      bighaInSqM: 2500,
    },
    cropYieldConfigs: {
      Rice: { yieldTonsPerHa: 2.8, durationDays: 120 },
      Wheat: { yieldTonsPerHa: 3.5, durationDays: 135 },
      Mustard: { yieldTonsPerHa: 1.4, durationDays: 120 },
      Gram: { yieldTonsPerHa: 1.1, durationDays: 110 },
      Soybeans: { yieldTonsPerHa: 1.1, durationDays: 100 },
      Cotton: { yieldTonsPerHa: 0.45, durationDays: 170 },
      Sugarcane: { yieldTonsPerHa: 80.0, durationDays: 365 },
      Groundnut: { yieldTonsPerHa: 1.7, durationDays: 110 },
      Corn: { yieldTonsPerHa: 3.3, durationDays: 110 },
      Bajra: { yieldTonsPerHa: 1.4, durationDays: 85 },
      Sorghum: { yieldTonsPerHa: 1.0, durationDays: 110 },
      Chilli: { yieldTonsPerHa: 2.0, durationDays: 160 },
    },
    fpoName: "Sahyadri Agro Farmers Producer Co. Ltd.",
    district: "Pune, Maharashtra",
    cacheTtlHours: 24,
    apiConcurrency: 3,
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) setSettings(data.settings);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage("Settings successfully updated!");
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (err: any) {
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingApi(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/test-connection", {
        method: "POST",
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        status: "error",
        message: err.message || "Failed to contact server",
      });
    } finally {
      setTestingApi(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 flex items-center gap-2.5">
            <SettingsIcon className="w-7 h-7 text-emerald-700 dark:text-emerald-400" />
            <span>Platform Configuration</span>
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
            Configure Google Agricultural Understanding API connection, scoring tolerance limits, crop yields, and unit standards.
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm flex items-center gap-2 self-start disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving..." : "Save Configuration"}</span>
        </button>
      </div>

      {saveMessage && (
        <div className="p-3.5 bg-emerald-100 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-700" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* API Connectivity & Data Mode */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-700" />
            <span>Google Agricultural Understanding API Mode</span>
          </h2>
          <DemoBadge isMock={settings.dataMode === "mock"} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 space-y-2 text-xs">
            <span className="font-semibold text-stone-700 dark:text-stone-300 block">
              Execution Environment:
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm uppercase">
                {settings.dataMode === "live" ? "Live Production API" : "Mock Fixtures Mode"}
              </span>
              <span className="text-stone-500 font-mono">
                ({settings.hasApiKey ? "API Key Detected in .env.local" : "Offline Fixtures"})
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              Mock mode serves realistic GeoJSON payloads around Google's benchmark coordinate (lat 18.624, lng 73.076).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 space-y-2 text-xs flex flex-col justify-between">
            <div>
              <span className="font-semibold text-stone-700 dark:text-stone-300 block">
                Health Probe:
              </span>
              <p className="text-[11px] text-stone-500">
                Tests connection to https://agriculturalunderstanding.googleapis.com without exposing secrets.
              </p>
            </div>
            <button
              type="button"
              disabled={testingApi}
              onClick={handleTestConnection}
              className="py-2 px-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs hover:opacity-90 disabled:opacity-50 self-start"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{testingApi ? "Pinging..." : "Test API Connection"}</span>
            </button>
          </div>
        </div>

        {testResult && (
          <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-800 text-xs font-mono space-y-1">
            <div className="font-bold text-emerald-700">Status: {testResult.status}</div>
            <div className="text-stone-600 dark:text-stone-300">{testResult.message}</div>
            {testResult.latencyMs && (
              <div className="text-stone-400 text-[11px]">Latency: {testResult.latencyMs} ms</div>
            )}
          </div>
        )}
      </div>

      {/* Verification Scoring Thresholds */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-5">
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Scoring Decision Thresholds</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block">
              Area Match Tolerance (≤ % deviation)
            </label>
            <input
              type="number"
              value={settings.thresholds.areaMatchPct}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  thresholds: { ...settings.thresholds, areaMatchPct: parseFloat(e.target.value) || 0 },
                })
              }
              className="w-full mt-1 p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950/40"
            />
            <span className="text-[11px] text-stone-500">Default: 10% (Deviations under 10% are marked Match)</span>
          </div>

          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block">
              Area Partial Tolerance (&gt; 10% and ≤ %)
            </label>
            <input
              type="number"
              value={settings.thresholds.areaPartialPct}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  thresholds: { ...settings.thresholds, areaPartialPct: parseFloat(e.target.value) || 0 },
                })
              }
              className="w-full mt-1 p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950/40"
            />
            <span className="text-[11px] text-stone-500">Default: 25% (Deviations above 25% become Mismatch)</span>
          </div>

          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block">
              AMED Strong Crop Confidence Threshold
            </label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={settings.thresholds.cropStrongConf}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  thresholds: { ...settings.thresholds, cropStrongConf: parseFloat(e.target.value) || 0 },
                })
              }
              className="w-full mt-1 p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950/40"
            />
            <span className="text-[11px] text-stone-500">Default: 0.70 (From Google AMED documentation)</span>
          </div>

          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block">
              AMED Probable Crop Confidence Threshold
            </label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={settings.thresholds.cropProbableConf}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  thresholds: { ...settings.thresholds, cropProbableConf: parseFloat(e.target.value) || 0 },
                })
              }
              className="w-full mt-1 p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950/40"
            />
            <span className="text-[11px] text-stone-500">Default: 0.50 (Covers crop_1 or crop_2)</span>
          </div>

          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block">
              Minimum Historical Consistency Score (%)
            </label>
            <input
              type="number"
              value={settings.thresholds.historyConsistencyMin}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  thresholds: { ...settings.thresholds, historyConsistencyMin: parseFloat(e.target.value) || 0 },
                })
              }
              className="w-full mt-1 p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950/40"
            />
            <span className="text-[11px] text-stone-500">Default: 60% (Required for automated verification)</span>
          </div>

          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block">
              History Window Analyzed (Years)
            </label>
            <input
              type="number"
              min="1"
              max="6"
              value={settings.thresholds.historyYears}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  thresholds: { ...settings.thresholds, historyYears: parseInt(e.target.value) || 3 },
                })
              }
              className="w-full mt-1 p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950/40"
            />
            <span className="text-[11px] text-stone-500">Default: 3 years (Configurable up to 6 years)</span>
          </div>
        </div>
      </div>

      {/* Unit Conversions & District Config */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-700" />
          <span>State Land Area Units & Cache TTL</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block">
              1 Bigha Standard (in m²)
            </label>
            <input
              type="number"
              value={settings.unitConfig.bighaInSqM}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  unitConfig: { ...settings.unitConfig, bighaInSqM: parseFloat(e.target.value) || 2500 },
                })
              }
              className="w-full mt-1 p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950/40"
            />
            <span className="text-[11px] text-stone-500">Configurable per state (e.g. 2500 m²)</span>
          </div>

          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block">
              Cache TTL (Hours)
            </label>
            <input
              type="number"
              value={settings.cacheTtlHours}
              onChange={(e) =>
                setSettings({ ...settings, cacheTtlHours: parseInt(e.target.value) || 24 })
              }
              className="w-full mt-1 p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950/40"
            />
            <span className="text-[11px] text-stone-500">Default: 24h (satellite refreshes ~15 days)</span>
          </div>

          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block">
              Outgoing Request Concurrency
            </label>
            <input
              type="number"
              value={settings.apiConcurrency}
              onChange={(e) =>
                setSettings({ ...settings, apiConcurrency: parseInt(e.target.value) || 3 })
              }
              className="w-full mt-1 p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950/40"
            />
            <span className="text-[11px] text-stone-500">Protects Google Cloud API quota</span>
          </div>
        </div>
      </div>

      {/* Yield and Duration Reference Table */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-700" />
            <span>District Crop Yields & Duration Benchmarks</span>
          </h2>
          <p className="text-xs text-stone-500">
            Seed values are approximate district averages; adjust to your regional agricultural statistics.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 dark:bg-stone-800 font-semibold">
              <tr>
                <th className="p-3">Crop Name</th>
                <th className="p-3">Benchmark Yield (t/ha)</th>
                <th className="p-3">Typical Duration (Days)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {Object.entries(settings.cropYieldConfigs).map(([cName, cfg]: [string, any]) => (
                <tr key={cName}>
                  <td className="p-3 font-bold">{cName}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.05"
                      value={cfg.yieldTonsPerHa}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setSettings({
                          ...settings,
                          cropYieldConfigs: {
                            ...settings.cropYieldConfigs,
                            [cName]: { ...cfg, yieldTonsPerHa: val },
                          },
                        });
                      }}
                      className="w-24 p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={cfg.durationDays}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setSettings({
                          ...settings,
                          cropYieldConfigs: {
                            ...settings.cropYieldConfigs,
                            [cName]: { ...cfg, durationDays: val },
                          },
                        });
                      }}
                      className="w-24 p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-mono"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
