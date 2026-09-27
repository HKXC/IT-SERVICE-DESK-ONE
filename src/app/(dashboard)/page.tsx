import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge, Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TicketStatusChart, PriorityChart } from "@/components/dashboard/charts";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const meId = session.user.id;

  const me = await db.user.findUnique({
    where: { id: meId },
    include: { role: true },
  });
  const isTech = !!me?.role && me.role.name !== "Employee";

  const baseFilter = isTech ? {} : { requesterId: meId };
  const openFilter = { ...baseFilter, status: { notIn: ["CLOSED", "RESOLVED"] as never[] } };

  const [
    openTickets,
    unassigned,
    slaRisk,
    resolvedToday,
    totalAssets,
    assetsRepair,
    lowStock,
    licensesExpiring,
    byStatus,
    byPriority,
  ] = await Promise.all([
    db.ticket.count({ where: openFilter as never }),
    db.ticket.count({ where: { ...openFilter, assigneeId: null } as never }),
    db.ticket.count({
      where: {
        ...(openFilter as object),
        slaResolutionDueAt: { lt: new Date(Date.now() + 4 * 3600 * 1000) },
      } as never,
    }),
    db.ticket.count({
      where: {
        ...(baseFilter as object),
        resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      } as never,
    }),
    db.asset.count(),
    db.asset.count({ where: { status: "REPAIR" } }),
    db.inventoryItem.count({ where: { quantity: { lte: 5 } } }),
    db.license.count({
      where: { expiryDate: { lt: new Date(Date.now() + 30 * 86400 * 1000) } },
    }),
    db.ticket.groupBy({ by: ["status"], _count: true, where: baseFilter as never }),
    db.ticket.groupBy({ by: ["priority"], _count: true, where: baseFilter as never }),
  ]);

  const stats = [
    { label: "Open Tickets", value: openTickets, href: "/tickets" },
    { label: "Unassigned", value: unassigned, href: "/tickets?filter=unassigned" },
    { label: "SLA At Risk", value: slaRisk, href: "/tickets?filter=sla-risk" },
    { label: "Resolved Today", value: resolvedToday, href: "/tickets" },
    { label: "Total Assets", value: totalAssets, href: "/assets" },
    { label: "Assets in Repair", value: assetsRepair, href: "/assets" },
    { label: "Low Stock Items", value: lowStock, href: "/inventory" },
    { label: "Licenses Expiring (30d)", value: licensesExpiring, href: "/software" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {isTech ? "IT Operations Dashboard" : "My IT Services"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome back{me?.name ? `, ${me.name}` : ""} · {me?.role?.name ?? "Employee"}
          </p>
        </div>
        <Link
          href="/tickets/new"
          className="rounded-lg bg-[#1E3A5F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16294a]"
        >
          + New Ticket
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tickets by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <TicketStatusChart
              data={byStatus.map((r) => ({ name: r.status.replaceAll("_", " "), value: r._count }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tickets by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <PriorityChart
              data={byPriority.map((r) => ({ name: r.priority, value: r._count }))}
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {byPriority.map((r) => (
                <PriorityBadge key={r.priority} priority={r.priority} />
              ))}
              {byPriority.length === 0 && <Badge variant="secondary">No tickets yet</Badge>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
