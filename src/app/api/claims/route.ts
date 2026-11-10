import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { monitorLandscape } from "@/lib/agri-api/client";
import { parseLandscapeGeoJson } from "@/lib/agri-api/parser";
import { latLngToS2CellIdLevel13, getS2EdgeNeighbors } from "@/lib/geo/s2";
import { findMatchingField, calculateOverlapRatio } from "@/lib/geo/turf-utils";
import { convertToSqMeters } from "@/lib/units";
import { evaluateOverallClaim } from "@/lib/scoring";
import { getPresentCropPrediction } from "@/lib/agri-api/crops";
import { AgriFeature, GeoJsonGeometry, MonitoringPrediction } from "@/lib/agri-api/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const farmerId = searchParams.get("farmerId");
    const crop = searchParams.get("crop");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (farmerId) where.farmerId = farmerId;
    if (crop) where.claimedCrop = crop;

    const claims = await prisma.claim.findMany({
      where,
      include: {
        farmer: true,
        fieldVisits: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ claims });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch claims" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      farmerId: inputFarmerId,
      farmerData,
      latitude,
      longitude,
      polygonGeometry,
      claimedCrop,
      claimedArea,
      unit = "acre",
      season = "Kharif",
      year = 2026,
      createdBy = "OFFICER",
      selectedFieldIds = [],
    } = body;

    // 1. Resolve or create farmer
    let farmerId = inputFarmerId;
    if (!farmerId && farmerData) {
      const count = await prisma.farmer.count();
      const code = `FPO-MH-2026-${String(count + 1).padStart(3, "0")}`;
      const newFarmer = await prisma.farmer.create({
        data: {
          farmerCode: code,
          name: farmerData.name,
          village: farmerData.village,
          phone: farmerData.phone,
          organicStatus: farmerData.organicStatus || "NONE",
        },
      });
      farmerId = newFarmer.id;
    }

    if (!farmerId) {
      return NextResponse.json({ error: "Farmer is required" }, { status: 400 });
    }

    // 2. Identify coordinates or center
    let centerLat = latitude;
    let centerLng = longitude;

    if (
      (centerLat === undefined || centerLng === undefined) &&
      polygonGeometry &&
      polygonGeometry.coordinates
    ) {
      // Use first coordinate of polygon
      const coords = polygonGeometry.coordinates[0];
      if (Array.isArray(coords) && coords[0]) {
        centerLng = coords[0][0];
        centerLat = coords[0][1];
      }
    }

    if (centerLat === undefined || centerLng === undefined) {
      // Default to demo region
      centerLat = 18.624;
      centerLng = 73.076;
    }

    // 3. Compute S2 Cell ID & query monitorLandscape
    const s2CellId = latLngToS2CellIdLevel13(centerLat, centerLng);
    const monitorRes = await monitorLandscape({
      locationSpecifier: { s2CellId },
    });
    const parsedCollection = parseLandscapeGeoJson(monitorRes.monitoredLandscape.geojson);

    let allFeatures: AgriFeature[] = [...parsedCollection.features];

    // 4. Field matching
    let matchedFields: AgriFeature[] = [];

    if (selectedFieldIds.length > 0) {
      // User explicitly picked or adjusted fields
      matchedFields = allFeatures.filter((f) => selectedFieldIds.includes(f.id));
    } else if (polygonGeometry) {
      // Select every field intersecting by > 50%
      for (const f of allFeatures) {
        if (f.properties.alu_type === "field") {
          const ratio = calculateOverlapRatio(f.geometry, polygonGeometry);
          if (ratio >= 0.5) {
            matchedFields.push(f);
          }
        }
      }
    } else {
      // Point matching: Priority 1 = point in poly, Priority 2 = nearest within 30m
      let match = findMatchingField([centerLng, centerLat], allFeatures, 30);

      // If none found in main cell, check neighbor cells
      if (!match) {
        const neighbors = getS2EdgeNeighbors(s2CellId);
        for (const nCell of neighbors) {
          try {
            const nRes = await monitorLandscape({ locationSpecifier: { s2CellId: nCell } });
            const nFc = parseLandscapeGeoJson(nRes.monitoredLandscape.geojson);
            allFeatures.push(...nFc.features);
            match = findMatchingField([centerLng, centerLat], nFc.features, 30);
            if (match) break;
          } catch {
            // Continue
          }
        }
      }

      if (match) {
        matchedFields.push(match);
      }
    }

    // If still no fields matched, fallback to first field in collection for demo continuity
    if (matchedFields.length === 0 && allFeatures.length > 0) {
      const firstField = allFeatures.find((f) => f.properties.alu_type === "field");
      if (firstField) matchedFields.push(firstField);
    }

    // 5. Compute measured area and aggregate properties
    const totalMeasuredAreaSqM = matchedFields.reduce(
      (sum, f) => sum + (f.properties.area_sq_m || 0),
      0
    );
    const claimedAreaSqM = convertToSqMeters(Number(claimedArea), unit);

    const primaryField = matchedFields[0];
    const boundaryConf = primaryField?.properties.class_confidence ?? 0.85;

    // Gather season predictions from matched fields
    const allPredictions: MonitoringPrediction[] = [];
    for (const f of matchedFields) {
      if (f.properties.monitoring_prediction) {
        allPredictions.push(...f.properties.monitoring_prediction);
      }
    }

    // Find prediction matching target season (e.g. Kharif 2026)
    const targetSeasonLabel = `${season} ${year}`;
    const targetPrediction = allPredictions.find((p) =>
      p.season_id ? p.season_id.toLowerCase().includes(season.toLowerCase()) : false
    ) || getPresentCropPrediction(allPredictions) || allPredictions[0];

    // 6. Evaluate scoring
    const scores = evaluateOverallClaim(
      claimedAreaSqM,
      totalMeasuredAreaSqM,
      claimedCrop,
      targetPrediction,
      allPredictions,
      boundaryConf
    );

    // 7. Persist claim in database
    const locationObj = polygonGeometry || {
      type: "Point",
      coordinates: [centerLng, centerLat],
    };

    const claim = await prisma.claim.create({
      data: {
        farmerId,
        claimedCrop,
        claimedArea: Number(claimedArea),
        unit,
        season,
        year: Number(year),
        locationJson: JSON.stringify(locationObj),
        status: scores.overallStatus,
        scores: JSON.stringify(scores),
        reasons: JSON.stringify(scores.reasons),
        createdBy,
      },
      include: {
        farmer: true,
      },
    });

    // Create AuditLog
    await prisma.auditLog.create({
      data: {
        entity: "Claim",
        entityId: claim.id,
        action: "CREATE",
        userId: createdBy,
        claimId: claim.id,
        after: JSON.stringify({ status: scores.overallStatus, scores }),
      },
    });

    return NextResponse.json({
      claim,
      matchedFields,
      allFeatures,
      scores,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to verify claim" },
      { status: 500 }
    );
  }
}
