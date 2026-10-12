import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const forceReset = process.argv.includes("--force-reset");
  const existingUsers = await prisma.user.count();

  if (existingUsers > 0 && !forceReset) {
    console.log(
      `[Seed Guard] Database already contains ${existingUsers} user(s). Skipping destructive seed to preserve existing contacts, reminders, and settings.`
    );
    return;
  }

  console.log("🌱 Seeding RemindFlow AI with initial workspace & fictional demo data...");

  // Clean existing records in correct foreign key order (only when empty or --force-reset)
  await prisma.messageLog.deleteMany({});
  await prisma.campaignRecipient.deleteMany({});
  await prisma.scheduledJob.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.consentRecord.deleteMany({});
  await prisma.optOut.deleteMany({});
  await prisma.groupMembership.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.template.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.settings.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create Default User (Apex Coaching & Academy)
  const user = await prisma.user.create({
    data: {
      email: "rajesh.sharma@apexacademy.demo",
      name: "Dr. Rajesh Sharma",
      role: "ADMIN",
      defaultLanguage: "en",
      defaultTimezone: "Asia/Kolkata",
    },
  });

  // 2. Create User Settings
  await prisma.settings.create({
    data: {
      userId: user.id,
      defaultLanguage: "en",
      defaultTimezone: "Asia/Kolkata",
      simulationMode: true,
      autoConsentOnImport: false,
      optOutKeywords: "STOP,UNSUBSCRIBE,CANCEL",
    },
  });

  // 3. Create Groups
  const groupMaths = await prisma.group.create({
    data: {
      userId: user.id,
      name: "Class 10 CBSE Maths",
      description: "Morning batch for Board examination preparations",
      color: "#0D9488",
    },
  });

  const groupPhysics = await prisma.group.create({
    data: {
      userId: user.id,
      name: "Class 12 Physics",
      description: "JEE Advanced and Board focus group",
      color: "#2563EB",
    },
  });

  const groupParents = await prisma.group.create({
    data: {
      userId: user.id,
      name: "Parent Council",
      description: "Guardians and parents for monthly updates and PTMs",
      color: "#7C3AED",
    },
  });

  const groupRobotics = await prisma.group.create({
    data: {
      userId: user.id,
      name: "Weekend Robotics Club",
      description: "STEM and competition workshop participants",
      color: "#D97706",
    },
  });

  // 4. Create Fictional Contacts with Verified Consent and 1 Opted-Out Contact
  const contactsData = [
    {
      name: "Aarav Patel",
      phone: "+919876543201",
      email: "aarav.patel@example.com",
      roleOrGrade: "Student",
      notes: "Class 10 topper; needs periodic test notifications",
      consentStatus: "GRANTED",
      consentSource: "ADMISSION_FORM",
      groups: [groupMaths.id],
    },
    {
      name: "Sunita Deshmukh",
      phone: "+919876543202",
      email: "sunita.d@example.com",
      roleOrGrade: "Parent",
      notes: "Mother of Rohan Deshmukh (Class 10)",
      consentStatus: "GRANTED",
      consentSource: "PTM_REGISTRATION",
      groups: [groupMaths.id, groupParents.id],
    },
    {
      name: "Ishaan Verma",
      phone: "+919876543203",
      email: "ishaan.v@example.com",
      roleOrGrade: "Student",
      notes: "IIT Aspirant",
      consentStatus: "GRANTED",
      consentSource: "ONLINE_PORTAL",
      groups: [groupPhysics.id],
    },
    {
      name: "Meera Nair",
      phone: "+919876543204",
      email: "meera.nair@example.com",
      roleOrGrade: "Parent",
      notes: "Parent representative for Class 12",
      consentStatus: "GRANTED",
      consentSource: "EMAIL_CONFIRMATION",
      groups: [groupPhysics.id, groupParents.id],
    },
    {
      name: "Kabir Khan",
      phone: "+919876543205",
      email: "kabir.khan@example.com",
      roleOrGrade: "Member",
      notes: "Team captain for Robofest 2026",
      consentStatus: "GRANTED",
      consentSource: "CLUB_ENROLLMENT",
      groups: [groupRobotics.id],
    },
    {
      name: "Ananya Iyer",
      phone: "+919876543206",
      email: "ananya.iyer@example.com",
      roleOrGrade: "Student",
      notes: "Enrolled in both Maths & Robotics",
      consentStatus: "GRANTED",
      consentSource: "ADMISSION_FORM",
      groups: [groupMaths.id, groupRobotics.id],
    },
    {
      name: "Vikram Malhotra",
      phone: "+919876543207",
      email: "vikram.m@example.com",
      roleOrGrade: "Parent",
      notes: "Awaiting signed consent document",
      consentStatus: "PENDING",
      consentSource: "CSV_IMPORT",
      groups: [groupParents.id],
    },
    {
      name: "Pooja Reddy",
      phone: "+919876543208",
      email: "pooja.reddy@example.com",
      roleOrGrade: "Student",
      notes: "Requested opt-out via SMS keyword STOP",
      consentStatus: "REVOKED",
      consentSource: "INBOUND_KEYWORD_STOP",
      optOutStatus: true,
      optOutReason: "User texted STOP on 02 Oct 2026",
      optOutAt: new Date(Date.now() - 7 * 86400000),
      groups: [groupMaths.id],
    },
  ];

  const createdContacts = [];

  for (const c of contactsData) {
    const contact = await prisma.contact.create({
      data: {
        userId: user.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        roleOrGrade: c.roleOrGrade,
        notes: c.notes,
        consentStatus: c.consentStatus,
        consentSource: c.consentSource,
        consentTimestamp: new Date(),
        optOutStatus: c.optOutStatus || false,
        optOutReason: c.optOutReason,
        optOutAt: c.optOutAt,
      },
    });

    createdContacts.push(contact);

    // Create group memberships
    for (const gId of c.groups) {
      await prisma.groupMembership.create({
        data: {
          contactId: contact.id,
          groupId: gId,
        },
      });
    }

    // Create consent record audit log
    await prisma.consentRecord.create({
      data: {
        contactId: contact.id,
        status: c.consentStatus === "REVOKED" ? "REVOKED" : "GRANTED",
        source: c.consentSource,
        notes: `Initial record via ${c.consentSource}`,
        recordedBy: "System Setup",
      },
    });

    // If opted out, add to global suppression table
    if (c.optOutStatus) {
      await prisma.optOut.create({
        data: {
          phone: c.phone,
          reason: c.optOutReason,
          source: "KEYWORD_STOP",
        },
      });
    }
  }

  // 5. Create Reusable Message Templates
  await prisma.template.create({
    data: {
      userId: user.id,
      name: "Fee Reminder - Standard",
      category: "REMINDER",
      language: "en",
      content:
        "Dear {{name}}, this is a gentle reminder that your tuition fee for {{due_date}} is due. Kindly remit {{fee_amount}} at the academy counter or online portal. Thank you, Apex Academy.",
      variables: JSON.stringify(["name", "due_date", "fee_amount"]),
      status: "APPROVED",
    },
  });

  await prisma.template.create({
    data: {
      userId: user.id,
      name: "PTM Meeting Notice (Hindi)",
      category: "UTILITY",
      language: "hi",
      content:
        "नमस्ते {{name}}, Apex Academy की अभिभावक-शिक्षक बैठक (PTM) शनिवार को निर्धारित है। कृपया समय {{meeting_time}} पर उपस्थित होकर अपने बच्चे की प्रगति पर चर्चा करें। धन्यवाद!",
      variables: JSON.stringify(["name", "meeting_time"]),
      status: "APPROVED",
    },
  });

  // 6. Create Campaigns (Completed & Scheduled)
  const completedCampaign = await prisma.campaign.create({
    data: {
      userId: user.id,
      name: "Term 1 Maths Assessment Notice",
      objective: "Announce schedule for upcoming mock board exams",
      targetGroupId: groupMaths.id,
      status: "COMPLETED",
      language: "en",
      originalPrompt: "Notify Class 10 Maths batch about mock test on Monday",
      messageContent:
        "Dear {{name}}, please note that the Term 1 Mock Board Exam is scheduled for this Monday at 9:00 AM. Bring your geometry kit and admit slip.",
      variablesUsed: JSON.stringify(["name"]),
      totalRecipients: 4,
      successfulCount: 3,
      failedCount: 1, // Pooja Reddy was skipped due to opt-out
      startedAt: new Date(Date.now() - 86400000 * 2),
      completedAt: new Date(Date.now() - 86400000 * 2 + 15000),
      createdAt: new Date(Date.now() - 86400000 * 2),
    },
  });

  // Snapshots for completed campaign
  const mathsContacts = createdContacts.filter((c) =>
    contactsData.find((cd) => cd.name === c.name)?.groups.includes(groupMaths.id)
  );

  for (const mc of mathsContacts) {
    const isSuppressed = mc.optOutStatus || mc.consentStatus !== "GRANTED";
    await prisma.campaignRecipient.create({
      data: {
        campaignId: completedCampaign.id,
        contactId: mc.id,
        phoneSnapshot: mc.phone,
        nameSnapshot: mc.name,
        personalizedMessage: `Dear ${mc.name}, please note that the Term 1 Mock Board Exam is scheduled for this Monday at 9:00 AM. Bring your geometry kit and admit slip.`,
        status: isSuppressed ? "OPTED_OUT_SKIPPED" : "DELIVERED",
        providerMessageId: isSuppressed ? null : `sim_wamid_${Date.now()}_${mc.id.slice(-4)}`,
        errorMessage: isSuppressed ? "Contact has opted out of notifications." : null,
        errorCode: isSuppressed ? "OPT_OUT_SUPPRESSED" : null,
        sentAt: isSuppressed ? null : new Date(Date.now() - 86400000 * 2 + 1000),
        deliveredAt: isSuppressed ? null : new Date(Date.now() - 86400000 * 2 + 3000),
        readAt: isSuppressed ? null : new Date(Date.now() - 86400000 * 2 + 10000),
      },
    });
  }

  // Scheduled Campaign for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const scheduledCampaign = await prisma.campaign.create({
    data: {
      userId: user.id,
      name: "Class 12 Physics Doubt Clearing Session",
      objective: "Reminder for weekend problem-solving clinic",
      targetGroupId: groupPhysics.id,
      status: "SCHEDULED",
      language: "en",
      originalPrompt: "Send reminder to Class 12 Physics for doubt clearing session tomorrow at 10 AM",
      messageContent:
        "Hello {{name}}, reminder: Professor Sharma's JEE Doubt Session takes place tomorrow at 10:00 AM in Room 204. Bring your solved assignment sheets.",
      variablesUsed: JSON.stringify(["name"]),
      scheduledAt: tomorrow,
      totalRecipients: 2,
      createdAt: new Date(),
    },
  });

  await prisma.scheduledJob.create({
    data: {
      campaignId: scheduledCampaign.id,
      runAt: tomorrow,
      status: "PENDING",
      retryCount: 0,
      maxRetries: 3,
    },
  });

  // 7. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "WORKSPACE_SEEDED",
      entityType: "SYSTEM",
      details: JSON.stringify({
        contactsCount: createdContacts.length,
        groupsCount: 4,
        campaignsCount: 2,
        seedProfile: "Apex Coaching & Academy",
      }),
    },
  });

  console.log("✅ Seed completed successfully! Fictional demo database is populated.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
