import { NextRequest, NextResponse } from "next/server";
import { lookupLandscape, isMockMode, AgriApiError } from "@/lib/agri-api/client";
import { parseLandscapeGeoJson } from "@/lib/agri-api/parser";
import { getCacheKey, getFromCache, saveToCache } from "@/lib/agri-api/cache";
import { latLngToS2CellIdLevel13, s2CellIdToCenterLatLng } from "@/lib/geo/s2";
import { LookupLandscapeResponse, ParsedLandscapeResult } from "@/lib/agri-api/types";
import { getMockLookupResponse } from "@/lib/agri-api/mock";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      latitude,
      longitude,
      s2CellId: inputCellId,
      captureDate,
      dataVersion,
      forceRefresh = false,
    } = body;

    let s2CellId = inputCellId;
    if (!s2CellId && typeof latitude === "number" && typeof longitude === "number") {
      s2CellId = latLngToS2CellIdLevel13(latitude, longitude);
    }

    if (!s2CellId) {
      return NextResponse.json(
        { error: "Must provide either coordinates {latitude, longitude} or level-13 s2CellId" },
        { status: 400 }
      );
    }

    const captureDateKey = captureDate
      ? `${captureDate.year}-${captureDate.month}-${captureDate.day}`
      : undefined;
    const cacheKey = getCacheKey("lookup", s2CellId, captureDateKey, dataVersion?.version);

    // 1. Check cache
    if (!forceRefresh) {
      const cached = await getFromCache<LookupLandscapeResponse>(cacheKey);
      if (cached) {
        const featureCollection = parseLandscapeGeoJson(cached.data.landscape.geojson);
        const result: ParsedLandscapeResult = {
          endpoint: "lookup",
          s2CellId,
          dataVersion: cached.data.landscape.dataVersion,
          featureCollection,
          isMock: isMockMode(),
          cached: true,
          fetchedAt: cached.fetchedAt.toISOString(),
        };
        return NextResponse.json(result);
      }
    }

    // 2. Fetch from API or Mock
    const requestPayload = {
      locationSpecifier: { s2CellId },
      captureDate,
      dataVersion,
    };

    let response: LookupLandscapeResponse;
    let isMockResult = isMockMode();

    try {
      response = await lookupLandscape(requestPayload);
    } catch (err: unknown) {
      // If Google API returns 404 (S2 cell not yet indexed in Google's live preview),
      // generate realistic ALU parcel boundaries centered on the requested location!
      if (err instanceof AgriApiError && err.statusCode === 404) {
        const center =
          typeof latitude === "number" && typeof longitude === "number"
            ? { latitude, longitude }
            : s2CellIdToCenterLatLng(s2CellId);
        response = getMockLookupResponse(s2CellId, center);
        isMockResult = true;
      } else {
        throw err;
      }
    }

    // 3. Cache raw response
    await saveToCache(
      cacheKey,
      response,
      response.landscape.dataVersion.version,
      response.landscape.dataVersion.updateTime
        ? new Date(response.landscape.dataVersion.updateTime)
        : new Date()
    );

    // 4. Parse GeoJSON string
    const featureCollection = parseLandscapeGeoJson(response.landscape.geojson);

    const result: ParsedLandscapeResult = {
      endpoint: "lookup",
      s2CellId,
      dataVersion: response.landscape.dataVersion,
      featureCollection,
      isMock: isMockResult,
      cached: false,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof AgriApiError) {
      return NextResponse.json(
        { error: err.message, isNoCoverage: err.isNoCoverage },
        { status: err.statusCode }
      );
    }
    return NextResponse.json(
      { error: (err as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
