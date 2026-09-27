import { db } from "@/lib/db";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission("audit.read"))) redirect("/");
  const logs = await db.auditLog.findMany({
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Audit Logs</h1>
      <Card><CardHeader><CardTitle className="text-sm">Latest 100 events (append-only)</CardTitle></CardHeader>
        <CardContent className="space-y-1.5 text-xs">
          {logs.map((l) => <p key={l.id} className="font-mono">{new Date(l.createdAt).toLocaleString()} · {l.actor?.email ?? "system"} · {l.action} · {l.entity}{l.entityId ? `:${l.entityId.slice(0, 8)}` : ""}</p>)}
          {logs.length === 0 && <p className="text-muted-foreground">No audit events yet.</p>}
        </CardContent></Card>
    </div>
  );
}
