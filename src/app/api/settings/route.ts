import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WhatsAppCloudAdapter } from "@/lib/whatsapp-adapter";
import { recordAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      include: { settings: true },
    });

    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    const whatsappStatus = WhatsAppCloudAdapter.getConfigStatus();

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    const aiStatus = {
      hasGemini: Boolean(geminiKey && !geminiKey.includes("your-gemini") && geminiKey.length > 10),
      hasOpenai: Boolean(openaiKey && !openaiKey.includes("your-openai") && openaiKey.length > 10),
      activeEngine:
        geminiKey && !geminiKey.includes("your-gemini")
          ? "Google Gemini 1.5 Flash (Live)"
          : openaiKey && !openaiKey.includes("your-openai")
          ? "OpenAI GPT-4o-mini (Live)"
          : "RemindFlow Built-in Rule NLP Engine (Demo Mode)",
    };

    return NextResponse.json({
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        defaultLanguage: user.defaultLanguage,
        defaultTimezone: user.defaultTimezone,
      },
      settings: user.settings,
      integrations: {
        whatsapp: whatsappStatus,
        ai: aiStatus,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, defaultLanguage, defaultTimezone, optOutKeywords } = body;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name ? name.trim() : user.name,
        defaultLanguage: defaultLanguage || user.defaultLanguage,
        defaultTimezone: defaultTimezone || user.defaultTimezone,
      },
    });

    if (optOutKeywords !== undefined) {
      await prisma.settings.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          defaultLanguage: updatedUser.defaultLanguage,
          defaultTimezone: updatedUser.defaultTimezone,
          optOutKeywords: optOutKeywords.trim(),
        },
        update: {
          defaultLanguage: updatedUser.defaultLanguage,
          defaultTimezone: updatedUser.defaultTimezone,
          optOutKeywords: optOutKeywords.trim(),
        },
      });
    }

    await recordAuditLog({
      userId: user.id,
      action: "SETTINGS_UPDATED",
      entityType: "USER",
      entityId: user.id,
      details: { name: updatedUser.name, defaultTimezone: updatedUser.defaultTimezone },
    });

    return NextResponse.json({ success: true, profile: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "TEST_WHATSAPP_CONNECTION") {
      const status = WhatsAppCloudAdapter.getConfigStatus();

      if (status.isSimulationMode) {
        return NextResponse.json({
          status: "SIMULATION_MODE",
          message: "Meta WhatsApp API credentials are not configured in .env. RemindFlow is operating in Simulation Mode.",
          missingKeys: status.missingFields,
          instructions: "To connect real WhatsApp Cloud API, add WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_BUSINESS_ACCOUNT_ID in .env.",
        });
      }

      // Check format
      return NextResponse.json({
        status: "CONFIGURED",
        message: "Credentials detected for Meta WhatsApp Cloud API.",
        phoneNumberIdMasked: status.phoneNumberIdMasked,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
