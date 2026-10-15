import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/auth-guard";
import { notificationRepository } from "@/db/notification-repository";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const notifications = notificationRepository.findForUser(user.id, {
      unreadOnly,
      limit,
    });
    const unreadCount = notificationRepository.countUnreadForUser(user.id);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
