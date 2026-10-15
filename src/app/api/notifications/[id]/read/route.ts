import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/auth-guard";
import { notificationRepository } from "@/db/notification-repository";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    // Strict tenant isolation: user can only mark their own notification
    const success = notificationRepository.markAsRead(id, user.id);
    if (!success) {
      return NextResponse.json(
        { error: "Notification not found or access denied" },
        { status: 404 }
      );
    }

    const unreadCount = notificationRepository.countUnreadForUser(user.id);
    return NextResponse.json({
      success: true,
      unreadCount,
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
