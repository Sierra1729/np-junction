import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import * as turf from "@turf/turf";
import { GeoJsonGeometry } from "@/lib/agri-api/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lotCode: string }> }
) {
  try {
    const { lotCode } = await params;

    const lot = await prisma.lot.findUnique({
      where: { lotCode },
      include: {
        lotFields: {
          include: {
            field: {
              include: {
                seasons: {
                  orderBy: { startTs: "desc" },
                },
                farmer: true,
              },
            },
          },
        },
        lotFarmers: {
          include: {
            farmer: true,
          },
        },
      },
    });

    if (!lot) {
      return NextResponse.json({ error: "Produce Lot not found" }, { status: 404 });
    }

    // Fetch FPO settings
    const settingsRow = await prisma.settings.findUnique({ where: { id: 1 } });
    const settings = settingsRow ? JSON.parse(settingsRow.data) : {};
    const fpoName = settings.fpoName || "Sahyadri Agro Farmers Producer Co. Ltd.";
    const district = settings.district || "Pune, Maharashtra";

    // Build privacy-conscious farmer and field representations
    const sanitizedFarmers = lot.lotFarmers.map((lf) => {
      const f = lf.farmer;
      const firstNameOnly = f.name.split(" ")[0] || "Farmer";
      return {
        firstName: firstNameOnly,
        village: f.village,
        organicStatus: f.organicStatus,
        consentExactBoundary: f.consentExactBoundary,
      };
    });

    // Check consistency: Did satellite observe this lot's crop in recent season?
    let matchedCropInSatellite = false;
    let satelliteObservedCrop = "Unknown";
    let satelliteConfidence = 0;
    const allSeasons: Array<{
      seasonId: string;
      crop: string;
      confidence: number;
      startYear: number;
      isHarvestSeason: boolean;
    }> = [];

    const fieldGeometries: Array<{
      id: string;
      geometry: GeoJsonGeometry;
      isExact: boolean;
      areaSqM: number;
    }> = [];

    const harvestYear = new Date(lot.harvestDate).getFullYear();

    for (const lf of lot.lotFields) {
      const f = lf.field;
      const hasConsent = f.farmer?.consentExactBoundary ?? false;
      const parsedGeom = JSON.parse(f.geometry) as GeoJsonGeometry;

      if (hasConsent) {
        fieldGeometries.push({
          id: f.plusCodeId,
          geometry: parsedGeom,
          isExact: true,
          areaSqM: f.areaSqM,
        });
      } else {
        // Obfuscate to approximate 1km area
        try {
          const poly = turf.feature(parsedGeom as any);
          const center = turf.centroid(poly);
          const approxCircle = turf.circle(center, 0.5, { units: "kilometers" });
          fieldGeometries.push({
            id: f.plusCodeId,
            geometry: approxCircle.geometry as GeoJsonGeometry,
            isExact: false,
            areaSqM: f.areaSqM,
          });
        } catch {
          fieldGeometries.push({
            id: f.plusCodeId,
            geometry: parsedGeom,
            isExact: false,
            areaSqM: f.areaSqM,
          });
        }
      }

      // Collect seasons
      for (const s of f.seasons) {
        const sYear = new Date(s.startTs).getFullYear();
        const isHarvestSeason = sYear === harvestYear;

        if (s.crop1.toLowerCase() === lot.crop.toLowerCase()) {
          matchedCropInSatellite = true;
          satelliteObservedCrop = s.crop1;
          satelliteConfidence = s.conf1;
        }

        allSeasons.push({
          seasonId: `${s.crop1} (${sYear})`,
          crop: s.crop1,
          confidence: s.conf1,
          startYear: sYear,
          isHarvestSeason,
        });
      }
    }

    // Deduplicate seasons for display
    const uniqueSeasons = Array.from(
      new Map(allSeasons.map((item) => [`${item.crop}-${item.startYear}`, item])).values()
    ).slice(0, 8);

    // QR Data URL
    const traceUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/trace/${lot.lotCode}`;
    const qrDataUrl = await QRCode.toDataURL(traceUrl, {
      width: 320,
      margin: 2,
      color: { dark: "#15803d", light: "#ffffff" },
    });

    return NextResponse.json({
      lot: {
        lotCode: lot.lotCode,
        crop: lot.crop,
        quantityKg: lot.quantityKg,
        harvestDate: lot.harvestDate,
        certificationType: lot.certificationType,
        certificateUrl: lot.certificateUrl,
      },
      fpo: {
        name: fpoName,
        district,
      },
      farmers: sanitizedFarmers,
      fields: fieldGeometries,
      seasonsHistory: uniqueSeasons,
      satelliteCheck: {
        isMatch: matchedCropInSatellite,
        observedCrop: satelliteObservedCrop,
        confidence: satelliteConfidence,
        dataVersion: "2026.09.1",
        lastUpdated: "2026-09-15T04:30:00Z",
        source: "Google Agricultural Understanding API (ALU & AMED)",
      },
      qrDataUrl,
      traceUrl,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to load trace information" },
      { status: 500 }
    );
  }
}
