import { NextResponse } from "next/server";
import { isMockMode } from "@/lib/agri-api/client";

export async function POST() {
  const isMock = isMockMode();
  const apiKey = process.env.AGRI_UNDERSTANDING_API_KEY;

  if (isMock) {
    return NextResponse.json({
      status: "connected_mock",
      message: "Running in Mock Mode. Fixture dataset active for lat 18.624, lng 73.076.",
      endpoint: "https://agriculturalunderstanding.googleapis.com",
      dataMode: "mock",
      latencyMs: 12,
    });
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        status: "missing_key",
        message: "No API key configured in .env.local (AGRI_UNDERSTANDING_API_KEY).",
      },
      { status: 400 }
    );
  }

  const startTime = Date.now();
  try {
    const res = await fetch(
      `https://agriculturalunderstanding.googleapis.com/v1:lookupLandscape?key=${encodeURIComponent(
        apiKey
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationSpecifier: { s2CellId: "4316826463333515264" },
        }),
      }
    );

    const latencyMs = Date.now() - startTime;

    if (res.ok) {
      return NextResponse.json({
        status: "connected_live",
        message: "Successfully connected to Google Agricultural Understanding API (Live).",
        statusCode: 200,
        latencyMs,
      });
    }

    const text = await res.text();
    return NextResponse.json({
      status: "api_error",
      statusCode: res.status,
      message: `API returned status ${res.status}: ${text.slice(0, 200)}`,
      latencyMs,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      status: "network_error",
      message: (err as Error).message || "Network error contacting Google API",
      latencyMs: Date.now() - startTime,
    });
  }
}
