import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_THRESHOLDS } from "@/lib/scoring";
import { DEFAULT_CROP_CONFIGS } from "@/lib/harvest/estimator";
import { DEFAULT_UNIT_CONFIG } from "@/lib/units";

export async function GET() {
  try {
    const row = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!row) {
      const defaultData = {
        dataMode: process.env.AGRI_DATA_MODE || "mock",
        hasApiKey: Boolean(process.env.AGRI_UNDERSTANDING_API_KEY),
        thresholds: DEFAULT_THRESHOLDS,
        unitConfig: DEFAULT_UNIT_CONFIG,
        cropYieldConfigs: DEFAULT_CROP_CONFIGS,
        fpoName: "Sahyadri Agro Farmers Producer Co. Ltd.",
        district: "Pune, Maharashtra",
        cacheTtlHours: Number(process.env.AGRI_CACHE_TTL_HOURS) || 24,
        apiConcurrency: Number(process.env.AGRI_API_CONCURRENCY) || 3,
      };
      return NextResponse.json({ settings: defaultData });
    }

    const parsed = JSON.parse(row.data);
    return NextResponse.json({
      settings: {
        ...parsed,
        dataMode: process.env.AGRI_DATA_MODE || "mock",
        hasApiKey: Boolean(process.env.AGRI_UNDERSTANDING_API_KEY),
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = await prisma.settings.findUnique({ where: { id: 1 } });
    const currentData = current ? JSON.parse(current.data) : {};

    const updated = {
      ...currentData,
      ...body,
    };

    await prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1, data: JSON.stringify(updated) },
      update: { data: JSON.stringify(updated) },
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to save settings" },
      { status: 500 }
    );
  }
}
