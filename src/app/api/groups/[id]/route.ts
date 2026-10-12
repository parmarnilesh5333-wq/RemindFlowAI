import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findFirst();
    const existing = await prisma.group.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, color } = body;

    const updated = await prisma.group.update({
      where: { id: params.id },
      data: {
        name: name ? name.trim() : existing.name,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
        color: color || existing.color,
      },
    });

    await recordAuditLog({
      userId: user?.id,
      action: "GROUP_UPDATED",
      entityType: "GROUP",
      entityId: updated.id,
      details: { name: updated.name },
    });

    return NextResponse.json({ group: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findFirst();
    const group = await prisma.group.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { memberships: true } },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    await prisma.group.delete({
      where: { id: params.id },
    });

    await recordAuditLog({
      userId: user?.id,
      action: "GROUP_DELETED",
      entityType: "GROUP",
      entityId: params.id,
      details: { name: group.name, memberCount: group._count.memberships },
    });

    return NextResponse.json({ success: true, message: "Group deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
