import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhoneNumber } from "@/lib/phone";
import { recordAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
      include: {
        groupMemberships: {
          include: { group: true },
        },
        consentRecords: {
          orderBy: { timestamp: "desc" },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({
      contact: {
        ...contact,
        groups: contact.groupMemberships.map((gm) => gm.group),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findFirst();
    const existing = await prisma.contact.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, phone, email, roleOrGrade, notes, consentStatus, optOutStatus, groupIds } = body;

    let normalizedPhone = existing.phone;
    if (phone && phone !== existing.phone) {
      const pResult = normalizePhoneNumber(phone);
      if (!pResult.isValid) {
        return NextResponse.json({ error: pResult.error }, { status: 400 });
      }
      normalizedPhone = pResult.normalized;
    }

    const isOptedOut = optOutStatus !== undefined ? Boolean(optOutStatus) : (consentStatus === "REVOKED");

    // Track consent changes for audit log
    const consentChanged = consentStatus && consentStatus !== existing.consentStatus;

    const updated = await prisma.contact.update({
      where: { id: params.id },
      data: {
        name: name ? name.trim() : existing.name,
        phone: normalizedPhone,
        email: email !== undefined ? (email ? email.trim() : null) : existing.email,
        roleOrGrade: roleOrGrade !== undefined ? (roleOrGrade ? roleOrGrade.trim() : null) : existing.roleOrGrade,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
        consentStatus: consentStatus || existing.consentStatus,
        optOutStatus: isOptedOut,
        optOutAt: isOptedOut && !existing.optOutStatus ? new Date() : existing.optOutAt,
        optOutReason: isOptedOut ? "Updated via settings" : null,
      },
    });

    // Update group memberships if provided
    if (Array.isArray(groupIds)) {
      await prisma.groupMembership.deleteMany({
        where: { contactId: updated.id },
      });
      for (const gId of groupIds) {
        await prisma.groupMembership.create({
          data: {
            contactId: updated.id,
            groupId: gId,
          },
        });
      }
    }

    if (consentChanged) {
      await prisma.consentRecord.create({
        data: {
          contactId: updated.id,
          status: consentStatus,
          source: "ADMIN_UPDATE",
          notes: `Updated from ${existing.consentStatus} to ${consentStatus}`,
          recordedBy: user?.name || "Admin",
        },
      });

      if (isOptedOut) {
        await prisma.optOut.upsert({
          where: { phone: normalizedPhone },
          create: {
            phone: normalizedPhone,
            reason: "Admin updated to opted-out/revoked",
            source: "MANUAL",
          },
          update: {},
        });
      } else {
        await prisma.optOut.deleteMany({
          where: { phone: normalizedPhone },
        });
      }
    }

    await recordAuditLog({
      userId: user?.id,
      action: "CONTACT_UPDATED",
      entityType: "CONTACT",
      entityId: updated.id,
      details: { name: updated.name, consentChanged, consentStatus },
    });

    return NextResponse.json({ contact: updated });
  } catch (error: any) {
    console.error("Update contact error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findFirst();
    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await prisma.contact.delete({
      where: { id: params.id },
    });

    await recordAuditLog({
      userId: user?.id,
      action: "CONTACT_DELETED",
      entityType: "CONTACT",
      entityId: params.id,
      details: { name: contact.name, phone: contact.phone },
    });

    return NextResponse.json({ success: true, message: "Contact deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
