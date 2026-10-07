import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasCapability } from "@/lib/auth-helpers";
import { uploadFile, validateUpload, toErrorMessage } from "@/lib/storage";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";

const MAX_BYTES = 10 * 1024 * 1024; // must match storage.ts

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/tickets/:id/attachments — multipart form-data, field "file".
 * Allowed: the ticket requester, or staff holding ticket.update.
 * Every success writes TicketAttachment + TimelineEvent atomically where the
 * database writes are concerned (provider upload precedes the txn).
 */
export async function POST(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id: ticketId } = await params;

  const rl = await rateLimit(rateLimitKey("attach", userId), 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait a minute and retry." },
      { status: 429 }
    );
  }

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const canEditAny = await hasCapability("ticket.update");
  const isOwner = ticket.requesterId === userId;
  if (!isOwner && !canEditAny) {
    return NextResponse.json(
      { error: "Only the requester or IT staff may attach files" },
      { status: 403 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Field 'file' is required" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File exceeds 10 MB limit" },
      { status: 413 }
    );
  }
  const mimeType = file.type || "application/octet-stream";
  try {
    validateUpload(mimeType, file.size);
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 400 });
  }

  let stored: { key: string; url?: string };
  try {
    stored = await uploadFile(Buffer.from(await file.arrayBuffer()), file.name, mimeType);
  } catch (err) {
    return NextResponse.json(
      { error: `Upload failed: ${toErrorMessage(err)}` },
      { status: 502 }
    );
  }

  const attachment = await db.$transaction(async (tx) => {
    const created = await tx.ticketAttachment.create({
      data: {
        ticketId,
        fileName: file.name.slice(0, 200),
        fileSize: file.size,
        mimeType,
        storageKey: stored.key,
        storageUrl: stored.url ?? null,
        uploadedBy: userId,
      },
    });
    await tx.ticketTimelineEvent.create({
      data: {
        ticketId,
        actorId: userId,
        event: "FILE_ATTACHED",
        detail: `Attached ${file.name} (${file.size} bytes)`,
      },
    });
    return created;
  });

  return NextResponse.json({ data: attachment }, { status: 201 });
}
