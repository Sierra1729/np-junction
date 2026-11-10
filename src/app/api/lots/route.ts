import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

export async function GET() {
  try {
    const lots = await prisma.lot.findMany({
      include: {
        lotFields: {
          include: {
            field: true,
          },
        },
        lotFarmers: {
          include: {
            farmer: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ lots });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch lots" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      crop,
      quantityKg,
      harvestDate,
      certificationType = "NPOP",
      certificateUrl,
      fieldIds = [],
    } = body;

    if (!crop || !quantityKg || !harvestDate) {
      return NextResponse.json(
        { error: "Crop, Quantity (kg), and Harvest Date are required" },
        { status: 400 }
      );
    }

    const year = new Date(harvestDate).getFullYear();
    const cropCode = crop.toUpperCase().slice(0, 4);
    const count = await prisma.lot.count();
    const lotCode = `LOT-${year}-${cropCode}-${String(count + 1).padStart(3, "0")}`;

    // Create Lot
    const lot = await prisma.lot.create({
      data: {
        lotCode,
        crop,
        quantityKg: Number(quantityKg),
        harvestDate: new Date(harvestDate),
        certificationType,
        certificateUrl: certificateUrl || null,
      },
    });

    // Link fields and farmers
    for (const fId of fieldIds) {
      const field = await prisma.field.findUnique({
        where: { plusCodeId: fId },
      });

      if (field) {
        await prisma.lotField.create({
          data: {
            lotCode: lot.lotCode,
            plusCodeId: field.plusCodeId,
          },
        });

        if (field.farmerId) {
          await prisma.lotFarmer.upsert({
            where: {
              lotCode_farmerId: {
                lotCode: lot.lotCode,
                farmerId: field.farmerId,
              },
            },
            create: {
              lotCode: lot.lotCode,
              farmerId: field.farmerId,
            },
            update: {},
          });
        }
      }
    }

    // Generate QR code data URL (PNG)
    const traceUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/trace/${lot.lotCode}`;
    const qrDataUrl = await QRCode.toDataURL(traceUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: "#15803d",
        light: "#ffffff",
      },
    });

    return NextResponse.json({ lot, traceUrl, qrDataUrl });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to create lot" },
      { status: 500 }
    );
  }
}
