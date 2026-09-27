import { db } from "@/lib/db";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission("audit.read"))) redirect("/");
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();
  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { entity: { contains: q, mode: "insensitive" } },
    ];
  }
  const logs = await db.auditLog.findMany({
    where: where as never,
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Audit Logs</h1>
      <form action="/audit" method="get" className="flex gap-2" role="search">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Filter by action or entity…"
          aria-label="Filter audit logs"
          className="max-w-sm"
        />
        <Button type="submit" variant="secondary">Filter</Button>
        {q && <Link href="/audit" className="self-center text-sm text-[#0D9488] hover:underline">Clear</Link>}
      </form>
      <Card><CardHeader><CardTitle className="text-sm">Latest 100 events (append-only)</CardTitle></CardHeader>
        <CardContent className="space-y-1.5 text-xs">
          {logs.map((l) => <p key={l.id} className="font-mono">{new Date(l.createdAt).toLocaleString()} · {l.actor?.email ?? "system"} · {l.action} · {l.entity}{l.entityId ? `:${l.entityId.slice(0, 8)}` : ""}</p>)}
          {logs.length === 0 && <p className="text-muted-foreground">No audit events yet.</p>}
        </CardContent></Card>
    </div>
  );
}
