import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const village = searchParams.get("village");
    const organicStatus = searchParams.get("organicStatus");

    const where: Record<string, unknown> = {};

    if (village) where.village = village;
    if (organicStatus) where.organicStatus = organicStatus;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { farmerCode: { contains: search } },
      ];
    }

    const farmers = await prisma.farmer.findMany({
      where,
      include: {
        fields: {
          select: {
            plusCodeId: true,
            areaSqM: true,
            aluConfidence: true,
          },
        },
        claims: {
          select: {
            id: true,
            status: true,
            claimedCrop: true,
            claimedArea: true,
            unit: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ farmers });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch farmers" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, village, phone, consentExactBoundary = false, organicStatus = "NONE" } = body;

    if (!name || !village) {
      return NextResponse.json(
        { error: "Name and Village are required" },
        { status: 400 }
      );
    }

    const count = await prisma.farmer.count();
    const farmerCode = `FPO-MH-2026-${String(count + 1).padStart(3, "0")}`;

    const farmer = await prisma.farmer.create({
      data: {
        farmerCode,
        name,
        village,
        phone,
        consentExactBoundary: Boolean(consentExactBoundary),
        organicStatus,
      },
    });

    return NextResponse.json({ farmer });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to create farmer" },
      { status: 500 }
    );
  }
}
