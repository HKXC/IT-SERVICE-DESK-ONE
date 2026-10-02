import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge, Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TicketStatusChart, PriorityChart } from "@/components/dashboard/charts";
import { ArrowRight, CheckCircle2, CircleAlert, Clock3, Monitor, PackageX, Ticket, Wrench } from "lucide-react";

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
    { label: "Open tickets", value: openTickets, href: "/tickets", icon: Ticket, tone: "text-[#a9c395]", hint: "View ticket queue" },
    { label: "Unassigned", value: unassigned, href: "/tickets?filter=unassigned", icon: CircleAlert, tone: "text-orange-500 dark:text-orange-300", hint: "Needs an owner" },
    { label: "SLA at risk", value: slaRisk, href: "/tickets?filter=sla-risk", icon: Clock3, tone: "text-rose-500 dark:text-rose-300", hint: "Review deadlines" },
    { label: "Resolved today", value: resolvedToday, href: "/tickets", icon: CheckCircle2, tone: "text-[#a9c395]", hint: "Completed work" },
  ];
  const resources = [
    { label: "Total assets", value: totalAssets, href: "/assets", icon: Monitor },
    { label: "Assets in repair", value: assetsRepair, href: "/assets", icon: Wrench },
    { label: "Low stock items", value: lowStock, href: "/inventory", icon: PackageX },
    { label: "Licenses expiring", value: licensesExpiring, href: "/software", icon: Clock3 },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_90%_0%,rgba(169,195,149,0.12),transparent_52%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-green-700 dark:text-[#a9c395]">Your workspace / Overview</p>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            {isTech ? "IT Operations Dashboard" : "My IT Services"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Welcome back{me?.name ? `, ${me.name}` : ""} · {me?.role?.name ?? "Employee"}
          </p>
        </div>
        <Link
          href="/tickets/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#a9c395] px-4 py-2 text-sm font-semibold text-[#0b1110] shadow-sm transition-colors hover:bg-[#bdd5aa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a9c395]"
        >
          New ticket <ArrowRight className="size-4" aria-hidden />
        </Link>
        </div>
      </div>

      <section aria-labelledby="ticket-overview-heading" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="ticket-overview-heading" className="text-base font-semibold">Ticket overview</h2>
          <Link href="/tickets" className="text-sm font-medium text-green-700 hover:underline dark:text-[#a9c395]">View all tickets</Link>
        </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a9c395]">
            <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-[#a9c395]/40 group-hover:shadow-md">
              <CardContent className="p-5">
                <div className="mb-5 flex items-center justify-between">
                  <span className={`flex size-10 items-center justify-center rounded-lg bg-muted ${s.tone}`}><s.icon className="size-5" aria-hidden /></span>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden />
                </div>
                <p className="text-3xl font-bold tabular-nums tracking-tight">{s.value}</p>
                <p className="mt-1 text-sm font-semibold">{s.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      </section>

      <section aria-labelledby="resources-heading" className="space-y-3">
        <h2 id="resources-heading" className="text-base font-semibold">Assets and resources</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {resources.map((item) => (
            <Link key={item.label} href={item.href} className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-[#a9c395]/40 hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a9c395]">
              <item.icon className="size-5 shrink-0 text-green-700 dark:text-[#a9c395]" aria-hidden />
              <div className="min-w-0 flex-1"><p className="text-sm text-muted-foreground">{item.label}</p><p className="text-xl font-semibold tabular-nums">{item.value}</p></div>
              <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="trends-heading" className="space-y-3">
        <h2 id="trends-heading" className="text-base font-semibold">Ticket breakdown</h2>
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
      </section>
    </div>
  );
}
