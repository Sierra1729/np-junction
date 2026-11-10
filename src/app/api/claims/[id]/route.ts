import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        farmer: true,
        fieldVisits: {
          orderBy: { createdAt: "desc" },
        },
        auditLogs: {
          orderBy: { at: "desc" },
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const scores = JSON.parse(claim.scores || "{}");
    const reasons = JSON.parse(claim.reasons || "[]");
    const location = JSON.parse(claim.locationJson || "{}");

    return NextResponse.json({
      claim: {
        ...claim,
        parsedScores: scores,
        parsedReasons: reasons,
        parsedLocation: location,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch claim" },
      { status: 500 }
    );
  }
}
