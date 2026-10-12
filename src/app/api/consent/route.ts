import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhoneNumber } from "@/lib/phone";
import { recordAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    // Suppression list
    const optOuts = await prisma.optOut.findMany({
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    // Consent audit history
    const consentAudit = await prisma.consentRecord.findMany({
      include: {
        contact: {
          select: { name: true, phone: true },
        },
      },
      orderBy: { timestamp: "desc" },
      take: 50,
    });

    // Consent breakdown counts
    const [granted, pending, revoked] = await Promise.all([
      prisma.contact.count({ where: { userId: user.id, consentStatus: "GRANTED" } }),
      prisma.contact.count({ where: { userId: user.id, consentStatus: "PENDING" } }),
      prisma.contact.count({ where: { userId: user.id, consentStatus: "REVOKED" } }),
    ]);

    return NextResponse.json({
      metrics: {
        granted,
        pending,
        revoked,
        totalOptOuts: optOuts.length,
      },
      optOuts,
      consentAudit,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    const body = await request.json();
    const { action, phone, reason = "Manual opt-out request", contactId, newStatus } = body;

    if (action === "ADD_OPT_OUT") {
      const pResult = normalizePhoneNumber(phone);
      if (!pResult.isValid) {
        return NextResponse.json({ error: pResult.error }, { status: 400 });
      }

      const optOut = await prisma.optOut.upsert({
        where: { phone: pResult.normalized },
        create: {
          phone: pResult.normalized,
          reason,
          source: "MANUAL_PRIVACY_CENTER",
        },
        update: {
          reason,
          source: "MANUAL_PRIVACY_CENTER",
        },
      });

      // Update any existing contacts with this phone
      await prisma.contact.updateMany({
        where: { phone: pResult.normalized },
        data: {
          optOutStatus: true,
          optOutReason: reason,
          optOutAt: new Date(),
          consentStatus: "REVOKED",
        },
      });

      await recordAuditLog({
        userId: user.id,
        action: "OPT_OUT_ADDED",
        entityType: "SUPPRESSION_LIST",
        entityId: optOut.id,
        details: { phone: pResult.normalized, reason },
      });

      return NextResponse.json({ success: true, optOut });
    }

    if (action === "REMOVE_OPT_OUT") {
      const pResult = normalizePhoneNumber(phone);
      if (!pResult.isValid) {
        return NextResponse.json({ error: pResult.error }, { status: 400 });
      }

      await prisma.optOut.deleteMany({
        where: { phone: pResult.normalized },
      });

      await prisma.contact.updateMany({
        where: { phone: pResult.normalized },
        data: {
          optOutStatus: false,
          optOutReason: null,
          optOutAt: null,
          consentStatus: "GRANTED",
        },
      });

      await recordAuditLog({
        userId: user.id,
        action: "OPT_OUT_REMOVED",
        entityType: "SUPPRESSION_LIST",
        details: { phone: pResult.normalized },
      });

      return NextResponse.json({ success: true, message: "Removed from suppression list" });
    }

    if (action === "UPDATE_CONTACT_CONSENT" && contactId && newStatus) {
      const contact = await prisma.contact.findUnique({ where: { id: contactId } });
      if (!contact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }

      const isRevoked = newStatus === "REVOKED";

      const updated = await prisma.contact.update({
        where: { id: contactId },
        data: {
          consentStatus: newStatus,
          optOutStatus: isRevoked,
          optOutReason: isRevoked ? "Consent changed to REVOKED" : null,
          optOutAt: isRevoked ? new Date() : null,
        },
      });

      await prisma.consentRecord.create({
        data: {
          contactId,
          status: newStatus,
          source: "PRIVACY_CENTER_ACTION",
          notes: `Updated status from ${contact.consentStatus} to ${newStatus}`,
          recordedBy: user.name,
        },
      });

      if (isRevoked) {
        await prisma.optOut.upsert({
          where: { phone: contact.phone },
          create: {
            phone: contact.phone,
            reason: "Contact consent revoked",
            source: "PRIVACY_CENTER",
          },
          update: {},
        });
      } else {
        await prisma.optOut.deleteMany({
          where: { phone: contact.phone },
        });
      }

      await recordAuditLog({
        userId: user.id,
        action: "CONSENT_UPDATED",
        entityType: "CONTACT",
        entityId: contact.id,
        details: { oldStatus: contact.consentStatus, newStatus, phone: contact.phone },
      });

      return NextResponse.json({ success: true, contact: updated });
    }

    return NextResponse.json({ error: "Invalid action or parameters." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
