import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

/** GET /api/notifications — own notifications, unread first, latest 20. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [items, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
      take: 20,
      select: { id: true, title: true, body: true, link: true, isRead: true, createdAt: true },
    }),
    db.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ]);
  return NextResponse.json({ data: items, unread });
}

/** POST /api/notifications — { all: true } or { ids: string[] } marks as read. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { all?: boolean; ids?: string[] } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (body.all) {
    const r = await db.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ updated: r.count });
  }
  const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string") : [];
  if (ids.length === 0 || ids.length > 50) {
    return NextResponse.json({ error: "Provide 1–50 ids, or { all: true }" }, { status: 400 });
  }
  const r = await db.notification.updateMany({
    where: { userId: session.user.id, id: { in: ids } },
    data: { isRead: true },
  });
  return NextResponse.json({ updated: r.count });
}
