import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/auth-guard";
import { notificationRepository } from "@/db/notification-repository";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const updatedCount = notificationRepository.markAllAsReadForUser(user.id);

    return NextResponse.json({
      success: true,
      updatedCount,
      unreadCount: 0,
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 });
  }
}
