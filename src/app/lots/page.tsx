"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { QrCode, Plus, ExternalLink, Download, ShieldCheck, Calendar, Sprout } from "lucide-react";
import QRCode from "qrcode";

export default function LotsListPage() {
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQrModal, setActiveQrModal] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    fetch("/api/lots")
      .then((res) => res.json())
      .then((data) => {
        if (data.lots) setLots(data.lots);
      })
      .finally(() => setLoading(false));
  }, []);

  const openQrModal = async (lot: any) => {
    const url = `${window.location.origin}/trace/${lot.lotCode}`;
    const dataUrl = await QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: { dark: "#15803d", light: "#ffffff" },
    });
    setQrDataUrl(dataUrl);
    setActiveQrModal({ lot, url });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 flex items-center gap-2.5">
            <QrCode className="w-7 h-7 text-emerald-700 dark:text-emerald-400" />
            <span>Organic Produce Traceability Lots</span>
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
            Every dispatch lot gets a verifiable QR code linking buyers to satellite parcel history.
          </p>
        </div>

        <Link
          href="/lots/new"
          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Produce Lot</span>
        </Link>
      </div>

      {/* Grid of Produce Lots */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {lots.map((lot) => (
          <div
            key={lot.lotCode}
            className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-2xs space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-stone-500">
                  {lot.lotCode}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                  {lot.certificationType}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-emerald-700" />
                  <span>{lot.crop}</span>
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 font-medium">
                  {lot.quantityKg.toLocaleString()} kg total batch volume
                </p>
              </div>

              <div className="p-3 bg-stone-50 dark:bg-stone-950/50 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-1 text-xs">
                <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                  <span>Harvest Date:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">
                    {new Date(lot.harvestDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                  <span>Source Plots:</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {lot.lotFields?.length || 2} satellite parcels
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center gap-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => openQrModal(lot)}
                className="flex-1 py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center justify-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>View QR Code</span>
              </button>
              <Link
                href={`/trace/${lot.lotCode}`}
                target="_blank"
                className="py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-2xs"
                title="Open Public Trace Page"
              >
                <span>Trace</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* QR Code Modal */}
      {activeQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 md:p-8 max-w-sm w-full space-y-4 shadow-2xl text-center relative">
            <button
              type="button"
              onClick={() => setActiveQrModal(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700"
            >
              ✕
            </button>
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                Printable Traceability Tag
              </span>
              <h4 className="text-lg font-bold">{activeQrModal.lot.lotCode}</h4>
              <p className="text-xs text-stone-500">
                {activeQrModal.lot.crop} • {activeQrModal.lot.certificationType}
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-stone-200 inline-block shadow-inner mx-auto">
              <img
                src={qrDataUrl}
                alt="Lot QR Code"
                className="w-48 h-48 mx-auto object-contain"
              />
            </div>

            <p className="text-[11px] text-stone-500">
              Attach to produce bags or invoices. Buyers scan this with any phone camera to audit satellite farm history.
            </p>

            <div className="flex gap-2 pt-2">
              <a
                href={qrDataUrl}
                download={`${activeQrModal.lot.lotCode}-QR.png`}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PNG</span>
              </a>
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold"
              >
                Print Label
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
