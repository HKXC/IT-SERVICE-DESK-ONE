import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; type?: string; page?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const sp = await searchParams;

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  const perms = new Set(me?.role?.permissions.map((p) => p.permission.key));
  const canSeeAll = perms.has("ticket.read_all");
  const isEmployee = me?.role?.name === "Employee";

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const where: Record<string, unknown> = {};
  if (!canSeeAll || sp.filter === "mine") (where as Record<string, unknown>).requesterId = session.user.id;
  if (sp.filter === "unassigned") {
    (where as Record<string, unknown>).assigneeId = null;
    (where as Record<string, unknown>).status = { notIn: ["CLOSED", "RESOLVED"] };
    if (!canSeeAll) (where as Record<string, unknown>).requesterId = session.user.id;
  }
  if (sp.filter === "sla-risk") {
    (where as Record<string, unknown>).status = { notIn: ["CLOSED", "RESOLVED", "PENDING_CONFIRMATION"] };
    (where as Record<string, unknown>).slaResolutionDueAt = {
      lt: new Date(Date.now() + 4 * 3600 * 1000),
    };
    if (isEmployee) (where as Record<string, unknown>).requesterId = session.user.id;
  }
  if (sp.type) (where as Record<string, unknown>).type = sp.type;
  if (sp.q) {
    (where as Record<string, unknown>).OR = [
      { ticketNo: { contains: sp.q, mode: "insensitive" } },
      { title: { contains: sp.q, mode: "insensitive" } },
    ];
  }
  if (isEmployee && !sp.filter) (where as Record<string, unknown>).requesterId = session.user.id;

  const [total, tickets] = await Promise.all([
    db.ticket.count({ where: where as never }),
    db.ticket.findMany({
      where: where as never,
      include: {
        requester: { select: { name: true, email: true } },
        assignee: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tickets {total > 0 && <span className="text-muted-foreground">({total})</span>}</h1>
        <Link href="/tickets/new">
          <Button>+ New Ticket</Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Link href="/tickets" className="underline">All</Link>
          <Link href="/tickets?filter=mine" className="underline">Mine</Link>
          <Link href="/tickets?filter=unassigned" className="underline">Unassigned</Link>
          <Link href="/tickets?filter=sla-risk" className="underline">SLA Risk</Link>
          <Link href="/tickets?type=INCIDENT" className="underline">Incidents</Link>
          <Link href="/tickets?type=SERVICE_REQUEST" className="underline">Requests</Link>
          <Link href="/tickets?type=PROBLEM" className="underline">Problems</Link>
          <Link href="/tickets?type=CHANGE_REQUEST" className="underline">Changes</Link>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Ticket</th>
                <th className="px-4 py-2.5">Title</th>
                <th className="px-4 py-2.5">Priority</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Assignee</th>
                <th className="px-4 py-2.5">Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-2.5 font-mono text-xs">
                    <Link href={`/tickets/${t.id}`} className="text-[#0D9488] hover:underline">
                      {t.ticketNo}
                    </Link>
                  </td>
                  <td className="max-w-[320px] truncate px-4 py-2.5">{t.title}</td>
                  <td className="px-4 py-2.5">
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="secondary">{t.status.replaceAll("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-2.5">{t.assignee?.name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {new Date(t.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No tickets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
