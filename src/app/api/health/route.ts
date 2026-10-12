import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WhatsAppCloudAdapter } from "@/lib/whatsapp-adapter";

export const dynamic = "force-dynamic";

export async function GET() {
  const missingEnv: string[] = [];
  if (!process.env.DATABASE_URL) {
    missingEnv.push("DATABASE_URL");
  }

  if (missingEnv.length > 0) {
    return NextResponse.json(
      {
        status: "error",
        message: `Missing required environment variable(s): ${missingEnv.join(", ")}`,
        databaseConnected: false,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  try {
    const userCount = await prisma.user.count();
    const whatsappStatus = WhatsAppCloudAdapter.getConfigStatus();
    const passcodeConfigured = Boolean(
      process.env.WORKSPACE_ACCESS_PASSCODE &&
        process.env.WORKSPACE_ACCESS_PASSCODE.trim().length > 0
    );

    return NextResponse.json({
      status: "ok",
      service: "RemindFlow AI",
      databaseConnected: true,
      initializedUsers: userCount,
      simulationMode: whatsappStatus.isSimulationMode,
      authProtectionEnabled: passcodeConfigured,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: "Database connection check failed. Verify DATABASE_URL configuration.",
        databaseConnected: false,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
