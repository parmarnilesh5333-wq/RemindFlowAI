import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCSVText, validateCSVRows, autoDetectColumnMapping, ColumnMapping } from "@/lib/csv";
import { recordAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    const body = await request.json();
    const { csvContent, mapping: userMapping, dryRun = false } = body;

    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json({ error: "csvContent string is required" }, { status: 400 });
    }

    const { headers, rows } = parseCSVText(csvContent);

    if (headers.length === 0 || rows.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty or does not contain valid data rows." },
        { status: 400 }
      );
    }

    const mapping: ColumnMapping = userMapping || autoDetectColumnMapping(headers);

    if (!mapping.name || !mapping.phone) {
      return NextResponse.json(
        {
          error: "Could not identify Name and Phone columns. Please provide explicit column mapping.",
          detectedHeaders: headers,
          autoMapping: mapping,
        },
        { status: 400 }
      );
    }

    const rowValidations = validateCSVRows(headers, rows, mapping);
    const validRows = rowValidations.filter((r) => r.isValid && r.parsed);
    const invalidRows = rowValidations.filter((r) => !r.isValid);

    if (dryRun) {
      // Return validation report without committing to database
      return NextResponse.json({
        totalRows: rowValidations.length,
        validCount: validRows.length,
        invalidCount: invalidRows.length,
        headers,
        mapping,
        previewValid: validRows.slice(0, 5).map((r) => r.parsed),
        invalidRows: invalidRows.map((r) => ({
          rowNumber: r.rowNumber,
          raw: r.raw,
          errors: r.errors,
        })),
      });
    }

    // Check existing phones in DB for duplicate detection
    const validPhones = validRows.map((r) => r.parsed!.phone);
    const existingContacts = await prisma.contact.findMany({
      where: {
        userId: user.id,
        phone: { in: validPhones },
      },
      select: { id: true, phone: true },
    });
    const existingPhoneMap = new Map(existingContacts.map((c) => [c.phone, c.id]));

    let importedCount = 0;
    let updatedCount = 0;

    // Cache user's existing groups for quick ID lookup or auto-creation
    const existingGroups = await prisma.group.findMany({
      where: { userId: user.id },
    });
    const groupMap = new Map(existingGroups.map((g) => [g.name.toLowerCase().trim(), g.id]));

    for (const validRow of validRows) {
      const data = validRow.parsed!;
      const existingId = existingPhoneMap.get(data.phone);

      // Handle groups
      const contactGroupIds: string[] = [];
      for (const gName of data.groupNames) {
        const cleanGName = gName.trim();
        const lowerGName = cleanGName.toLowerCase();
        let gId = groupMap.get(lowerGName);

        if (!gId) {
          // Auto-create group if it doesn't exist
          const newGroup = await prisma.group.create({
            data: {
              userId: user.id,
              name: cleanGName,
              description: "Auto-created from CSV import",
              color: "#FB7185",
            },
          });
          gId = newGroup.id;
          groupMap.set(lowerGName, gId);
        }
        contactGroupIds.push(gId);
      }

      const isRevoked = data.consentStatus === "REVOKED";

      if (existingId) {
        // Update existing contact
        await prisma.contact.update({
          where: { id: existingId },
          data: {
            name: data.name,
            email: data.email || null,
            roleOrGrade: data.roleOrGrade || null,
            notes: data.notes || null,
            consentStatus: data.consentStatus,
            optOutStatus: isRevoked,
            optOutReason: isRevoked ? "Consent marked REVOKED in CSV import" : null,
          },
        });

        // Add any new group memberships
        for (const gId of contactGroupIds) {
          await prisma.groupMembership.upsert({
            where: {
              contactId_groupId: {
                contactId: existingId,
                groupId: gId,
              },
            },
            create: {
              contactId: existingId,
              groupId: gId,
            },
            update: {},
          });
        }

        updatedCount++;
      } else {
        // Create new contact
        const created = await prisma.contact.create({
          data: {
            userId: user.id,
            name: data.name,
            phone: data.phone,
            email: data.email || null,
            roleOrGrade: data.roleOrGrade || null,
            notes: data.notes || null,
            consentStatus: data.consentStatus,
            consentSource: "CSV_IMPORT",
            consentTimestamp: new Date(),
            optOutStatus: isRevoked,
            optOutReason: isRevoked ? "Consent marked REVOKED in CSV import" : null,
            optOutAt: isRevoked ? new Date() : null,
          },
        });

        for (const gId of contactGroupIds) {
          await prisma.groupMembership.create({
            data: {
              contactId: created.id,
              groupId: gId,
            },
          });
        }

        // Add unverified consent record
        await prisma.consentRecord.create({
          data: {
            contactId: created.id,
            status: data.consentStatus,
            source: "CSV_IMPORT (Unverified self-reported)",
            notes: "Imported from CSV. User-provided information, not independently verified.",
            recordedBy: user.name,
          },
        });

        if (isRevoked) {
          await prisma.optOut.upsert({
            where: { phone: data.phone },
            create: {
              phone: data.phone,
              reason: "Revoked in CSV import",
              source: "CSV_IMPORT",
            },
            update: {},
          });
        }

        importedCount++;
      }
    }

    await recordAuditLog({
      userId: user.id,
      action: "CSV_IMPORT_COMPLETED",
      entityType: "CONTACTS",
      details: {
        totalRows: rowValidations.length,
        importedCount,
        updatedCount,
        invalidCount: invalidRows.length,
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: rowValidations.length,
        importedCount,
        updatedCount,
        invalidCount: invalidRows.length,
        errors: invalidRows.map((r) => ({
          rowNumber: r.rowNumber,
          errors: r.errors,
          sample: r.raw,
        })),
      },
    });
  } catch (error: any) {
    console.error("CSV import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
