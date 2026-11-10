import { NextRequest, NextResponse } from "next/server";
import { monitorLandscape, isMockMode, AgriApiError } from "@/lib/agri-api/client";
import { parseLandscapeGeoJson } from "@/lib/agri-api/parser";
import { getCacheKey, getFromCache, saveToCache } from "@/lib/agri-api/cache";
import { latLngToS2CellIdLevel13, s2CellIdToCenterLatLng } from "@/lib/geo/s2";
import { MonitorLandscapeResponse, ParsedLandscapeResult } from "@/lib/agri-api/types";
import { getMockMonitorResponse } from "@/lib/agri-api/mock";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      latitude,
      longitude,
      s2CellId: inputCellId,
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

    const cacheKey = getCacheKey("monitor", s2CellId, undefined, dataVersion?.version);

    // 1. Check cache
    if (!forceRefresh) {
      const cached = await getFromCache<MonitorLandscapeResponse>(cacheKey);
      if (cached) {
        const featureCollection = parseLandscapeGeoJson(cached.data.monitoredLandscape.geojson);
        const result: ParsedLandscapeResult = {
          endpoint: "monitor",
          s2CellId,
          dataVersion: cached.data.monitoredLandscape.dataVersion,
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
      dataVersion,
    };

    let response: MonitorLandscapeResponse;
    let isMockResult = isMockMode();

    try {
      response = await monitorLandscape(requestPayload);
    } catch (err: unknown) {
      // If Google API returns 404 (S2 cell not yet indexed in Google's live preview),
      // generate realistic ALU parcel boundaries centered on the requested location!
      if (err instanceof AgriApiError && err.statusCode === 404) {
        const center =
          typeof latitude === "number" && typeof longitude === "number"
            ? { latitude, longitude }
            : s2CellIdToCenterLatLng(s2CellId);
        response = getMockMonitorResponse(s2CellId, center);
        isMockResult = true;
      } else {
        throw err;
      }
    }

    // 3. Cache raw response
    await saveToCache(
      cacheKey,
      response,
      response.monitoredLandscape.dataVersion.version,
      response.monitoredLandscape.dataVersion.updateTime
        ? new Date(response.monitoredLandscape.dataVersion.updateTime)
        : new Date()
    );

    // 4. Parse GeoJSON string
    const featureCollection = parseLandscapeGeoJson(response.monitoredLandscape.geojson);

    const result: ParsedLandscapeResult = {
      endpoint: "monitor",
      s2CellId,
      dataVersion: response.monitoredLandscape.dataVersion,
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
