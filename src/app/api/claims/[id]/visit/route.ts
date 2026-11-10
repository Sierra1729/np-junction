import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { outcome, note, photoUrl, lat = 18.624, lng = 73.076, officerId = "officer@krishisatya.org" } = body;

    if (!outcome) {
      return NextResponse.json({ error: "Visit outcome is required" }, { status: 400 });
    }

    const claim = await prisma.claim.findUnique({ where: { id } });
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // 1. Create FieldVisit
    const visit = await prisma.fieldVisit.create({
      data: {
        claimId: id,
        officerId,
        outcome,
        note,
        photoUrl,
        lat: Number(lat),
        lng: Number(lng),
      },
    });

    // 2. Update claim status based on human field officer decision
    // AI assists, humans decide
    let newStatus = claim.status;
    if (outcome === "CONFIRMED") {
      newStatus = "VERIFIED";
    } else if (outcome === "REJECTED") {
      newStatus = "MISMATCH";
    } else if (outcome === "CORRECTED") {
      newStatus = "NEEDS_VISIT";
    }

    const updatedClaim = await prisma.claim.update({
      where: { id },
      data: {
        status: newStatus,
      },
    });

    // 3. Log audit trail
    await prisma.auditLog.create({
      data: {
        entity: "FieldVisit",
        entityId: visit.id,
        action: "VISIT_RECORDED",
        userId: officerId,
        claimId: id,
        before: JSON.stringify({ status: claim.status }),
        after: JSON.stringify({ status: newStatus, outcome, note }),
      },
    });

    return NextResponse.json({ visit, claim: updatedClaim });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to record field visit" },
      { status: 500 }
    );
  }
}
