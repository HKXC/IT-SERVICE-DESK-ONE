import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { headers } from "next/headers";

// PUBLIC restricted view — ONLY assetTag, name, status + Report Problem.
// NEVER expose serial/IP/MAC/assignee/cost here (§3 security rule).
export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await headers();
  const ip = h.get("x-forwarded-for") ?? "unknown";
  const rl = await rateLimit(rateLimitKey("scan", ip), 30, 60_000);
  if (!rl.ok) return <div className="p-8 text-center">Too many scans. Try again shortly.</div>;

  const asset = await db.asset.findUnique({
    where: { id },
    select: { id: true, assetTag: true, name: true, status: true },
  });
  if (!asset) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-4">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>Asset Lookup</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Tag:</span> <span className="font-mono font-bold">{asset.assetTag}</span></p>
          <p><span className="text-muted-foreground">Name:</span> {asset.name}</p>
          <p><span className="text-muted-foreground">Status:</span> <Badge variant="secondary">{asset.status.replaceAll("_", " ")}</Badge></p>
          <Link
            href={`/login?callbackUrl=/tickets/new&assetId=${asset.id}`}
            className="mt-3 block rounded-lg bg-[#0D9488] px-4 py-2.5 text-center font-semibold text-white"
          >
            Report Problem
          </Link>
          <p className="text-center text-xs text-muted-foreground">Sign in to auto-link this asset to your ticket.</p>
        </CardContent>
      </Card>
    </div>
  );
}
