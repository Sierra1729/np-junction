import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { monitorLandscape } from "@/lib/agri-api/client";
import { parseLandscapeGeoJson } from "@/lib/agri-api/parser";
import { latLngToS2CellIdLevel13 } from "@/lib/geo/s2";
import { findMatchingField } from "@/lib/geo/turf-utils";
import { convertToSqMeters } from "@/lib/units";
import { evaluateOverallClaim } from "@/lib/scoring";
import { getPresentCropPrediction } from "@/lib/agri-api/crops";

interface BulkRow {
  farmer_id?: string;
  name?: string;
  village?: string;
  phone?: string;
  lat: number;
  lng: number;
  claimed_crop: string;
  claimed_area: number;
  unit?: string;
  organic_status?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows = (body.rows || []) as BulkRow[];

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No claim rows provided" }, { status: 400 });
    }

    const results = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Resolve or create farmer
        let farmer = row.farmer_id
          ? await prisma.farmer.findUnique({ where: { farmerCode: row.farmer_id } })
          : null;

        if (!farmer) {
          const count = await prisma.farmer.count();
          const code = row.farmer_id || `FPO-MH-2026-${String(count + 1).padStart(3, "0")}`;
          farmer = await prisma.farmer.create({
            data: {
              farmerCode: code,
              name: row.name || `Farmer ${i + 1}`,
              village: row.village || "Ranjangaon",
              phone: row.phone || null,
              organicStatus: row.organic_status || "NONE",
            },
          });
        }

        const lat = Number(row.lat) || 18.624;
        const lng = Number(row.lng) || 73.076;
        const s2CellId = latLngToS2CellIdLevel13(lat, lng);

        const monitorRes = await monitorLandscape({ locationSpecifier: { s2CellId } });
        const fc = parseLandscapeGeoJson(monitorRes.monitoredLandscape.geojson);

        const match = findMatchingField([lng, lat], fc.features, 40) || fc.features[0];
        const measuredSqM = match?.properties?.area_sq_m || 10000;
        const claimedSqM = convertToSqMeters(Number(row.claimed_area) || 1, row.unit || "acre");

        const preds = match?.properties?.monitoring_prediction || [];
        const topPred = getPresentCropPrediction(preds) || preds[0];

        const score = evaluateOverallClaim(
          claimedSqM,
          measuredSqM,
          row.claimed_crop,
          topPred,
          preds,
          match?.properties?.class_confidence ?? 0.85
        );

        const claim = await prisma.claim.create({
          data: {
            farmerId: farmer.id,
            claimedCrop: row.claimed_crop,
            claimedArea: Number(row.claimed_area) || 1,
            unit: row.unit || "acre",
            season: "Kharif",
            year: 2026,
            locationJson: JSON.stringify(match?.geometry || { type: "Point", coordinates: [lng, lat] }),
            status: score.overallStatus,
            scores: JSON.stringify(score),
            reasons: JSON.stringify(score.reasons),
            createdBy: "BULK_IMPORT",
          },
        });

        results.push({
          row: i + 1,
          farmerCode: farmer.farmerCode,
          farmerName: farmer.name,
          claimedCrop: row.claimed_crop,
          status: score.overallStatus,
          score: score.overallScore,
          claimId: claim.id,
        });
      } catch (rowErr: unknown) {
        results.push({
          row: i + 1,
          error: (rowErr as Error).message || "Verification failed for row",
        });
      }
    }

    return NextResponse.json({ totalProcessed: rows.length, results });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to process bulk claims" },
      { status: 500 }
    );
  }
}
