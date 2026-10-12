import { NextResponse } from "next/server";
import { SchedulerService } from "@/lib/scheduler-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const result = await SchedulerService.processDueCampaigns();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      timezone: "Asia/Kolkata",
      simulationMode: true,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
