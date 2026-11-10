"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, User, MapPin, ShieldCheck, Sprout, Calendar } from "lucide-react";
import { StatusChip } from "@/components/shared/StatusChip";
import { formatAreaWithHectares } from "@/lib/units";

export default function MemberDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [farmer, setFarmer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/farmers/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.farmer) setFarmer(data.farmer);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="text-center py-16">
        <p>Member not found.</p>
        <Link href="/members" className="text-emerald-700 underline text-sm mt-2 inline-block">
          Return to Member Registry
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link
        href="/members"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Registry</span>
      </Link>

      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
          <div>
            <span className="text-xs font-bold font-mono text-stone-500">
              {farmer.farmerCode}
            </span>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <User className="w-6 h-6 text-emerald-700" />
              <span>{farmer.name}</span>
            </h1>
            <p className="text-xs text-stone-500 mt-1">Village: {farmer.village}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
              {farmer.organicStatus} Certified
            </span>
          </div>
        </div>

        {/* Registered Agricultural Fields */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-700" />
            <span>Registered Satellite Parcels ({farmer.fields?.length || 0})</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(farmer.fields || []).map((f: any) => (
              <div
                key={f.plusCodeId}
                className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                    {f.plusCodeId}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    {(f.aluConfidence * 100).toFixed(0)}% ALU Conf
                  </span>
                </div>
                <div className="text-stone-600 dark:text-stone-400">
                  Area: <strong>{formatAreaWithHectares(f.areaSqM, "acre")}</strong>
                </div>

                {f.seasons && f.seasons.length > 0 && (
                  <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-1">
                    <span className="text-[11px] font-semibold text-stone-500">
                      Recent Crop Predictions:
                    </span>
                    {f.seasons.slice(0, 3).map((s: any) => (
                      <div key={s.id} className="flex justify-between text-[11px]">
                        <span>{s.crop1}</span>
                        <span className="font-mono text-stone-500">
                          {(s.conf1 * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Claims History */}
        <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-stone-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Submitted Verification Claims ({farmer.claims?.length || 0})</span>
          </h2>

          <div className="space-y-2">
            {(farmer.claims || []).map((c: any) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs hover:bg-stone-50"
              >
                <div>
                  <div className="font-bold text-stone-900 dark:text-stone-100">
                    {c.claimedCrop} ({c.claimedArea} {c.unit})
                  </div>
                  <span className="text-stone-500 font-medium">
                    {c.season} {c.year}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <StatusChip status={c.status} size="sm" />
                  <Link
                    href={`/verify/${c.id}`}
                    className="font-bold text-emerald-700 hover:underline"
                  >
                    View Report
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
