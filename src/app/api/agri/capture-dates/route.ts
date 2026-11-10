import { NextRequest, NextResponse } from "next/server";
import { lookupLandscapeCaptureDate, AgriApiError } from "@/lib/agri-api/client";
import { latLngToS2CellIdLevel13 } from "@/lib/geo/s2";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { latitude, longitude, s2CellId: inputCellId } = body;

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

    const captureDates = await lookupLandscapeCaptureDate({ s2CellId });
    return NextResponse.json({ s2CellId, captureDates });
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
