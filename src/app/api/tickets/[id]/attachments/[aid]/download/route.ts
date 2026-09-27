import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/auth-helpers";
import { getS3Config, toErrorMessage } from "@/lib/storage";

type RouteParams = { params: Promise<{ id: string; aid: string }> };

/**
 * GET /api/tickets/:id/attachments/:aid/download
 * Same visibility rule as upload: the requester, or staff with ticket.update.
 * - Vercel Blob (storageUrl set) → redirect to the blob URL.
 * - S3 (key under attachments/) → proxy bytes with original content-type.
 * - Local /tmp fallback → read from disk and stream.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id: ticketId, aid } = await params;

  const attachment = await db.ticketAttachment.findUnique({
    where: { id: aid },
    include: { ticket: { select: { id: true, requesterId: true } } },
  });
  if (!attachment || attachment.ticketId !== ticketId) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  const canEditAny = await hasPermission("ticket.update");
  const isOwner = attachment.ticket.requesterId === userId;
  if (!isOwner && !canEditAny) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const safeName = attachment.fileName.replace(/["\r\n]/g, "_");
  const headers = {
    "Content-Type": attachment.mimeType,
    "Content-Disposition": `attachment; filename="${safeName}"`,
  };

  if (attachment.storageUrl) {
    return NextResponse.redirect(attachment.storageUrl, 302);
  }

  const s3 = getS3Config();
  if (s3 && attachment.storageKey.startsWith("attachments/")) {
    try {
      const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
      const client = new S3Client({
        endpoint: s3.endpoint,
        region: s3.region,
        forcePathStyle: s3.forcePathStyle,
        credentials: { accessKeyId: s3.accessKeyId, secretAccessKey: s3.secretAccessKey },
      });
      const out = await client.send(
        new GetObjectCommand({ Bucket: s3.bucket, Key: attachment.storageKey })
      );
      if (!out.Body) throw new Error("Empty object body");
      const stream = (out.Body as { transformToWebStream?: () => ReadableStream }).transformToWebStream
        ? (out.Body as { transformToWebStream: () => ReadableStream }).transformToWebStream()
        : (out.Body as unknown as ReadableStream);
      return new NextResponse(stream, { headers });
    } catch (err) {
      return NextResponse.json(
        { error: `Download failed: ${toErrorMessage(err)}` },
        { status: 502 }
      );
    }
  }

  try {
    const { readFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join, basename } = await import("node:path");
    const file = await readFile(join(tmpdir(), "itsd-uploads", basename(attachment.storageKey)));
    return new NextResponse(new Uint8Array(file), { headers });
  } catch {
    return NextResponse.json(
      { error: "File no longer available on this server (ephemeral dev storage)" },
      { status: 410 }
    );
  }
}
