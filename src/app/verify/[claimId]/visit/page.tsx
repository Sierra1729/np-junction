"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ClipboardCheck,
  Locate,
  Camera,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
} from "lucide-react";
import { StatusChip } from "@/components/shared/StatusChip";

export default function FieldVisitPage() {
  const params = useParams();
  const router = useRouter();
  const claimId = params.claimId as string;

  const [claim, setClaim] = useState<any>(null);
  const [outcome, setOutcome] = useState<"CONFIRMED" | "CORRECTED" | "REJECTED">("CONFIRMED");
  const [note, setNote] = useState("");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number }>({
    lat: 18.6242,
    lng: 73.0763,
  });
  const [acquiringGps, setAcquiringGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/claims/${claimId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.claim) {
          setClaim(data.claim);
        }
      });
  }, [claimId]);

  const handleAcquireGps = () => {
    setAcquiringGps(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setAcquiringGps(false);
        },
        () => {
          setAcquiringGps(false);
        }
      );
    } else {
      setAcquiringGps(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/claims/${claimId}/visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome,
          note,
          lat: gpsCoords.lat,
          lng: gpsCoords.lng,
          officerId: "pooja.patil@krishisatya.org",
        }),
      });

      const data = await res.json();
      if (data.visit) {
        router.push(`/verify/${claimId}`);
      } else {
        alert(data.error || "Failed to record visit");
      }
    } catch (err: any) {
      alert(err.message || "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!claim) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Link
        href={`/verify/${claimId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Report</span>
      </Link>

      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 mb-2">
            FIELD OFFICER ON-SITE RECORD
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-emerald-700" />
            <span>Record Ground Inspection</span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
            Farmer: <span className="font-bold">{claim.farmer.name}</span> • Claimed:{" "}
            <span className="font-semibold">{claim.claimedCrop}</span> ({claim.claimedArea} {claim.unit})
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Inspection Outcome Selector (Large touch buttons for mobile) */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-stone-700 dark:text-stone-300 tracking-wider">
              Onsite Verification Outcome *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setOutcome("CONFIRMED")}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all ${
                  outcome === "CONFIRMED"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300 ring-2 ring-emerald-500/30"
                    : "border-stone-200 dark:border-stone-800 text-stone-600 hover:bg-stone-50"
                }`}
              >
                <CheckCircle className="w-5 h-5 mb-1.5 text-emerald-600" />
                <span>Confirmed</span>
              </button>

              <button
                type="button"
                onClick={() => setOutcome("CORRECTED")}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all ${
                  outcome === "CORRECTED"
                    ? "border-amber-600 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 ring-2 ring-amber-500/30"
                    : "border-stone-200 dark:border-stone-800 text-stone-600 hover:bg-stone-50"
                }`}
              >
                <AlertTriangle className="w-5 h-5 mb-1.5 text-amber-600" />
                <span>Corrected</span>
              </button>

              <button
                type="button"
                onClick={() => setOutcome("REJECTED")}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all ${
                  outcome === "REJECTED"
                    ? "border-rose-600 bg-rose-50 text-rose-900 dark:bg-rose-950/50 dark:text-rose-300 ring-2 ring-rose-500/30"
                    : "border-stone-200 dark:border-stone-800 text-stone-600 hover:bg-stone-50"
                }`}
              >
                <XCircle className="w-5 h-5 mb-1.5 text-rose-600" />
                <span>Rejected</span>
              </button>
            </div>
          </div>

          {/* GPS Coordinates Capture */}
          <div className="p-4 bg-stone-50 dark:bg-stone-950/50 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Ground Inspector GPS Fix
              </span>
              <button
                type="button"
                onClick={handleAcquireGps}
                disabled={acquiringGps}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
              >
                <Locate className="w-3.5 h-3.5" />
                <span>{acquiringGps ? "Acquiring..." : "Refresh GPS"}</span>
              </button>
            </div>
            <div className="font-mono text-xs text-stone-600 dark:text-stone-400">
              Latitude: {gpsCoords.lat.toFixed(6)} | Longitude: {gpsCoords.lng.toFixed(6)}
            </div>
            <span className="text-[11px] text-stone-500">
              Accuracy: ±4.2 meters • Stand directly at the field bund
            </span>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-stone-700 dark:text-stone-300 tracking-wider">
              Field Inspection Notes & Observations
            </label>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Record crop standing stage, actual sowing date, intercropping or border landmarks..."
              className="w-full p-3 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
            />
          </div>

          {/* Photo upload placeholder */}
          <div className="border border-dashed border-stone-300 dark:border-stone-700 rounded-xl p-4 flex items-center justify-center gap-2 text-xs text-stone-500 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800">
            <Camera className="w-4 h-4 text-emerald-700" />
            <span>Attach Field Photo with Geo-tag (Optional)</span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-sm transition-all"
          >
            {isSubmitting ? "Saving Audit Trail..." : "Save Field Inspection Outcome"}
          </button>
        </form>
      </div>
    </div>
  );
}
