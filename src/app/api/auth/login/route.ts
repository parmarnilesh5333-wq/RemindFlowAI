import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const configuredPasscode = (process.env.WORKSPACE_ACCESS_PASSCODE || "").trim();

    // If no passcode is required, immediately succeed
    if (!configuredPasscode) {
      return NextResponse.json({ success: true, mode: "open_local" });
    }

    const body = await request.json();
    const submitted = (body?.passcode || "").trim();

    if (!submitted || submitted !== configuredPasscode) {
      return NextResponse.json(
        { error: "Invalid workspace access passcode." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("remindflow_access_token", configuredPasscode, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid login request payload." },
      { status: 400 }
    );
  }
}
