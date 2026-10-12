import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseReminderPrompt } from "@/lib/ai-reminder-engine";

export async function POST(request: NextRequest) {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    const body = await request.json();
    const { prompt, timezone, targetLanguage, language, selectedGroupId } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Instruction prompt is required (e.g., 'Create a fee reminder for the Students group tomorrow at 10 AM')." },
        { status: 400 }
      );
    }

    // Load user's actual database groups to match audience
    const groups = await prisma.group.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
    });

    const userTimezone = timezone || user.defaultTimezone || "Asia/Kolkata";
    const requestedLanguage = targetLanguage || language;

    const extraction = await parseReminderPrompt({
      userPrompt: prompt.trim(),
      existingGroups: groups,
      userTimezone,
      currentDate: new Date(),
      targetLanguage: requestedLanguage,
      selectedGroupId: selectedGroupId || undefined,
    });

    return NextResponse.json({
      extraction,
      availableGroups: groups,
    });
  } catch (error: any) {
    console.error("AI parse reminder error:", error);
    return NextResponse.json(
      { error: "Failed to parse reminder prompt", details: error.message },
      { status: 500 }
    );
  }
}
