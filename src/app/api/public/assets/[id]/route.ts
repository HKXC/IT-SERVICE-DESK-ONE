import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Restricted public QR lookup: ONLY tag/name/status. No auth required
// but rate-limited upstream in the /scan page; this JSON mirrors it.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await db.asset.findUnique({
    where: { id },
    select: { assetTag: true, name: true, status: true },
  });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: asset });
}
