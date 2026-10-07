import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssetOps } from "@/components/assets/asset-ops";
import { hasCapability } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const asset = await db.asset.findUnique({
    where: { id },
    include: {
      history: { orderBy: { createdAt: "desc" }, take: 50 },
      assignments: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { assignedAt: "desc" },
        take: 10,
      },
      tickets: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!asset) notFound();

  const canManage = await hasCapability("asset.manage");
  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 500,
  });
  const responsible =
    asset.assignments.find((a) => !a.returnedAt)?.user.name ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-sm text-muted-foreground">{asset.assetTag}</span>
        <h1 className="text-xl font-bold">{asset.name}</h1>
        <Badge variant="secondary">{asset.status.replaceAll("_", " ")}</Badge>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="card-motion">
            <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent className="grid gap-1 text-sm sm:grid-cols-2">
              <p><span className="text-muted-foreground">Type:</span> {asset.type}</p>
              <p><span className="text-muted-foreground">Serial:</span> {asset.serialNumber ?? "—"}</p>
              <p><span className="text-muted-foreground">Brand:</span> {asset.brand ?? "—"}</p>
              <p><span className="text-muted-foreground">Model:</span> {asset.model ?? "—"}</p>
              <p><span className="text-muted-foreground">Responsible User:</span> {responsible}</p>
            </CardContent>
          </Card>
          <Card className="card-motion">
            <CardHeader><CardTitle className="text-sm">Ticket History ({asset.tickets.length})</CardTitle></CardHeader>
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
            </CardContent>
          </Card>
          <Card className="card-motion">
            <CardHeader><CardTitle className="text-sm">Asset History</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {asset.history.map((h) => (
                <p key={h.id}>
                  <span className="text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</span> ·{" "}
                  <strong>{h.event.replaceAll("_", " ")}</strong>{" "}
                  {h.fromStatus && h.toStatus ? `${h.fromStatus} → ${h.toStatus}` : ""}{" "}
                  {h.detail ? `· ${h.detail}` : ""}
                </p>
              ))}
              {asset.history.length === 0 && <p className="text-muted-foreground">No history yet.</p>}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="card-motion">
            <CardHeader><CardTitle className="text-sm">Assignment History</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {asset.assignments.map((a) => (
                <p key={a.id}>
                  {a.user.name} · {new Date(a.assignedAt).toLocaleDateString()}{" "}
                  {a.returnedAt ? `(returned ${new Date(a.returnedAt).toLocaleDateString()})` : "(current)"}
                </p>
              ))}
              {asset.assignments.length === 0 && <p className="text-muted-foreground">Never assigned.</p>}
            </CardContent>
          </Card>
          <AssetOps
            assetId={asset.id}
            currentStatus={asset.status}
            assignedUserId={asset.assignedUserId}
            canManage={canManage}
            users={users.map((u) => ({ id: u.id, name: u.name ?? u.email ?? "Unknown" }))}
          />
        </div>
      </div>
    </div>
  );
}
