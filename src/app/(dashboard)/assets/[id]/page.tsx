import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssetOps } from "@/components/assets/asset-ops";
import { hasPermission } from "@/lib/auth-helpers";
import QRCode from "react-qr-code";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const asset = await db.asset.findUnique({
    where: { id },
    include: {
      department: true, location: true, vendor: true,
      history: { orderBy: { createdAt: "desc" }, take: 50 },
      assignments: { include: { user: { select: { name: true, email: true } } }, orderBy: { assignedAt: "desc" }, take: 10 },
      tickets: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!asset) notFound();

  const repairCount = asset.history.filter((h) => h.event === "REPAIR").length;
  const recentRepairs = asset.history.filter(
    (h) => h.event === "REPAIR" && Date.now() - new Date(h.createdAt).getTime() < 180 * 86400 * 1000
  ).length;
  const frequentRepair = recentRepairs >= 3;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const qrValue = `${baseUrl}/scan/${asset.id}`;

  const [canUpdate, canAssign, canRetire, canDispose, users] = await Promise.all([
    hasPermission("asset.update"),
    hasPermission("asset.assign"),
    hasPermission("asset.retire"),
    hasPermission("asset.dispose"),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-sm text-muted-foreground">{asset.assetTag}</span>
        <h1 className="text-xl font-bold">{asset.name}</h1>
        <Badge variant="secondary">{asset.status.replaceAll("_", " ")}</Badge>
        {frequentRepair && <Badge variant="danger">Frequent Repair — consider replacement</Badge>}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card><CardHeader><CardTitle className="text-sm">Specification</CardTitle></CardHeader>
            <CardContent className="grid gap-1 text-sm sm:grid-cols-2">
              <p><span className="text-muted-foreground">Brand/Model:</span> {asset.brand ?? "—"} {asset.model ?? ""}</p>
              <p><span className="text-muted-foreground">Serial:</span> {asset.serialNumber ?? "—"}</p>
              <p><span className="text-muted-foreground">CPU:</span> {asset.cpu ?? "—"}</p>
              <p><span className="text-muted-foreground">RAM:</span> {asset.ram ?? "—"}</p>
              <p><span className="text-muted-foreground">Storage:</span> {asset.storage ?? "—"}</p>
              <p><span className="text-muted-foreground">OS:</span> {asset.os ?? "—"} {asset.osVersion ?? ""}</p>
              <p><span className="text-muted-foreground">Hostname/IP:</span> {asset.hostname ?? "—"} / {asset.ipAddress ?? "—"}</p>
              <p><span className="text-muted-foreground">Warranty:</span> {asset.warrantyEnd ? new Date(asset.warrantyEnd).toLocaleDateString() : "—"}</p>
            </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Ticket History ({asset.tickets.length}) · Repairs: {repairCount}</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {asset.tickets.map((t) => (
                <p key={t.id} className="font-mono text-xs">
                  <Link href={`/tickets/${t.id}`} className="text-[#0D9488] hover:underline">
                    {t.ticketNo}
                  </Link>{" "}
                  · {t.title} · {t.status.replaceAll("_", " ")}
                </p>
              ))}
              {asset.tickets.length === 0 && <p className="text-muted-foreground">No linked tickets.</p>}
            </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Asset History</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {asset.history.map((h) => (
                <p key={h.id}><span className="text-muted-foreground">{new Date(h.createdAt).toLocaleDateString()}</span> · <strong>{h.event}</strong> {h.fromStatus && h.toStatus ? `${h.fromStatus} → ${h.toStatus}` : ""} {h.detail ? `· ${h.detail}` : ""}</p>
              ))}
            </CardContent></Card>
        </div>
        <div className="space-y-4">
          <Card><CardHeader><CardTitle className="text-sm">QR Code</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center gap-2">
              <div className="bg-white p-3"><QRCode value={qrValue} size={160} /></div>
              <p className="break-all text-center font-mono text-[11px] text-muted-foreground">{qrValue}</p>
              <p className="text-xs text-muted-foreground">Scan → restricted view + “Report Problem” (creates linked ticket).</p>
            </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Assignment</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {asset.assignments.map((a) => <p key={a.id}>{a.user.name} · {new Date(a.assignedAt).toLocaleDateString()} {a.returnedAt ? `(returned ${new Date(a.returnedAt).toLocaleDateString()})` : "(current)"}</p>)}
              {asset.assignments.length === 0 && <p className="text-muted-foreground">Never assigned.</p>}
            </CardContent></Card>
          <AssetOps
            assetId={asset.id}
            currentStatus={asset.status}
            assignedUserId={asset.assignedUserId}
            canUpdate={canUpdate}
            canAssign={canAssign}
            showRetire={canRetire}
            showDispose={canDispose}
            users={users.map((u) => ({ id: u.id, name: u.name ?? u.email ?? "Unknown" }))}
          />
        </div>
      </div>
    </div>
  );
}
