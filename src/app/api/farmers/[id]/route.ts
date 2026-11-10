import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const farmer = await prisma.farmer.findUnique({
      where: { id },
      include: {
        fields: {
          include: {
            seasons: {
              orderBy: { startTs: "desc" },
            },
          },
        },
        claims: {
          include: {
            fieldVisits: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!farmer) {
      return NextResponse.json({ error: "Farmer not found" }, { status: 404 });
    }

    return NextResponse.json({ farmer });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch farmer" },
      { status: 500 }
    );
  }
}
