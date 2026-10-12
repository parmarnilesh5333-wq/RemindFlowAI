import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhoneNumber } from "@/lib/phone";
import { recordAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const groupId = searchParams.get("groupId");
    const consentStatus = searchParams.get("consentStatus");
    const optOutStatus = searchParams.get("optOutStatus");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const rawLimit = searchParams.get("limit");
    const limit = rawLimit === "all" ? 1000 : Math.max(1, Math.min(100, parseInt(rawLimit || "25", 10)));
    const skip = (page - 1) * limit;

    const where: any = {
      userId: user.id,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { roleOrGrade: { contains: search } },
      ];
    }

    if (groupId) {
      where.groupMemberships = {
        some: { groupId },
      };
    }

    if (consentStatus && consentStatus !== "ALL") {
      where.consentStatus = consentStatus;
    }

    if (optOutStatus !== null && optOutStatus !== undefined && optOutStatus !== "ALL") {
      where.optOutStatus = optOutStatus === "true";
    }

    const [total, unfilteredTotal, contacts] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.count({ where: { userId: user.id } }),
      prisma.contact.findMany({
        where,
        include: {
          groupMemberships: {
            include: {
              group: {
                select: { id: true, name: true, color: true },
              },
            },
          },
          consentRecords: {
            orderBy: { timestamp: "desc" },
            take: 3,
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      contacts: contacts.map((c) => ({
        ...c,
        groups: c.groupMemberships.map((gm) => gm.group),
      })),
      pagination: {
        total,
        unfilteredTotal,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: any) {
    console.error("Contacts list error:", error);
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
    const { name, phone, email, roleOrGrade, notes, consentStatus = "GRANTED", consentSource = "MANUAL_ENTRY", groupIds = [] } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const phoneValidation = normalizePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        { error: phoneValidation.error || "Invalid phone number format." },
        { status: 400 }
      );
    }

    // Check if phone already exists for this user
    const existing = await prisma.contact.findFirst({
      where: {
        userId: user.id,
        phone: phoneValidation.normalized,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Contact with phone number ${phoneValidation.normalized} already exists (${existing.name}).` },
        { status: 409 }
      );
    }

    const isRevoked = consentStatus === "REVOKED";

    const contact = await prisma.contact.create({
      data: {
        userId: user.id,
        name: name.trim(),
        phone: phoneValidation.normalized,
        email: email ? email.trim() : null,
        roleOrGrade: roleOrGrade ? roleOrGrade.trim() : null,
        notes: notes ? notes.trim() : null,
        consentStatus,
        consentSource,
        consentTimestamp: new Date(),
        optOutStatus: isRevoked,
        optOutReason: isRevoked ? "Consent set to REVOKED during creation" : null,
        optOutAt: isRevoked ? new Date() : null,
      },
    });

    // Add group memberships
    if (Array.isArray(groupIds) && groupIds.length > 0) {
      for (const gId of groupIds) {
        await prisma.groupMembership.create({
          data: {
            contactId: contact.id,
            groupId: gId,
          },
        });
      }
    }

    // Record consent audit entry
    await prisma.consentRecord.create({
      data: {
        contactId: contact.id,
        status: consentStatus,
        source: consentSource,
        notes: `Created with status ${consentStatus}`,
        recordedBy: user.name,
      },
    });

    // If opted out, sync with suppression list
    if (isRevoked) {
      await prisma.optOut.upsert({
        where: { phone: phoneValidation.normalized },
        create: {
          phone: phoneValidation.normalized,
          reason: "Consent set to REVOKED during creation",
          source: "MANUAL",
        },
        update: {},
      });
    }

    await recordAuditLog({
      userId: user.id,
      action: "CONTACT_CREATED",
      entityType: "CONTACT",
      entityId: contact.id,
      details: { name: contact.name, phone: contact.phone, consentStatus },
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error: any) {
    console.error("Create contact error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
