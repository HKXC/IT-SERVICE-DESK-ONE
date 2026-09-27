import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge, Badge } from "@/components/ui/badge";
import { TicketActions } from "@/components/tickets/ticket-actions";
import { CommentBox } from "@/components/tickets/comment-box";
import { Attachments } from "@/components/tickets/attachments";
import { AssignControl, WorkLogForm } from "@/components/tickets/ticket-ops";
import { canViewInternalNotes, hasPermission } from "@/lib/auth-helpers";
import { formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      requester: { select: { name: true, email: true } },
      assignee: { select: { name: true } },
      asset: { select: { id: true, assetTag: true, name: true } },
      workLogs: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      timeline: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      attachments: true,
    },
  });
  if (!ticket) notFound();

  const showInternal = await canViewInternalNotes();
  const canAssign = await hasPermission("ticket.assign");
  const canUpload =
    ticket.requesterId === session.user.id || (await hasPermission("ticket.update"));
  const [technicians, parts] = await Promise.all([
    db.user.findMany({
      where: { isActive: true, role: { name: { not: "Employee" } } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    db.inventoryItem.findMany({
      select: { id: true, name: true, quantity: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
  ]);
  const comments = await db.ticketComment.findMany({
    where: { ticketId: id, ...(showInternal ? {} : { type: "PUBLIC" }) },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const now = Date.now();
  const respRem = ticket.slaResponseDueAt
    ? Math.floor((new Date(ticket.slaResponseDueAt).getTime() - now) / 1000)
    : null;
  const resRem = ticket.slaResolutionDueAt
    ? Math.floor((new Date(ticket.slaResolutionDueAt).getTime() - now) / 1000)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-sm text-muted-foreground">{ticket.ticketNo}</span>
        <h1 className="text-xl font-bold">{ticket.title}</h1>
        <PriorityBadge priority={ticket.priority} />
        <Badge variant="secondary">{ticket.status.replaceAll("_", " ")}</Badge>
      </div>

      {(respRem !== null || resRem !== null) && (
        <Card className="border-[#0D9488]/30">
          <CardContent className="flex flex-wrap gap-6 p-4 text-sm">
            {respRem !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Response SLA</p>
                <p className={`font-mono font-bold ${respRem < 0 ? "text-red-600" : respRem < 3600 ? "text-amber-600" : "text-emerald-600"}`}>
                  {respRem < 0 ? `Breached ${formatDuration(-respRem)} ago` : `${formatDuration(respRem)} remaining`}
                </p>
              </div>
            )}
            {resRem !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Resolution SLA</p>
                <p className={`font-mono font-bold ${resRem < 0 ? "text-red-600" : resRem < 4 * 3600 ? "text-amber-600" : "text-emerald-600"}`}>
                  {resRem < 0 ? `Breached ${formatDuration(-resRem)} ago` : `${formatDuration(resRem)} remaining`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-sm">{ticket.description}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Conversation {showInternal ? "" : "(public only)"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className={`rounded-lg border p-3 text-sm ${c.type === "INTERNAL" ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30" : ""}`}>
                  <p className="mb-1 text-xs text-muted-foreground">
                    {c.author?.name ?? "Unknown"} · {new Date(c.createdAt).toLocaleString()}
                    {c.type === "INTERNAL" && " · Internal note"}
                  </p>
                  <p className="whitespace-pre-wrap">{c.body}</p>
                </div>
              ))}
              {comments.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
              <CommentBox ticketId={ticket.id} canInternal={showInternal} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Work Logs ({ticket.workLogs.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {ticket.workLogs.map((w) => (
                <div key={w.id} className="rounded-lg border p-3 text-sm">
                  <p className="text-xs text-muted-foreground">{w.author?.name} · {w.timeSpentMin} min · {new Date(w.createdAt).toLocaleString()}</p>
                  {w.title && <p className="font-semibold">{w.title}</p>}
                  <p className="whitespace-pre-wrap">{w.body}</p>
                </div>
              ))}
              {ticket.workLogs.length === 0 && <p className="text-sm text-muted-foreground">No work logged.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Activity Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {ticket.timeline.map((e) => (
                <div key={e.id} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</span>
                  <span><strong>{e.event}</strong> {e.fromStatus && e.toStatus ? `${e.fromStatus} → ${e.toStatus}` : ""} {e.detail ? `· ${e.detail}` : ""} {e.actor ? `(${e.actor.name})` : ""}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Requester:</span> {ticket.requester.name} ({ticket.requester.email})</p>
              <p><span className="text-muted-foreground">Assignee:</span> {ticket.assignee?.name ?? "Unassigned"}</p>
              <p><span className="text-muted-foreground">Type:</span> {ticket.type} · {ticket.category}</p>
              <p><span className="text-muted-foreground">Asset:</span> {ticket.asset ? `${ticket.asset.assetTag} · ${ticket.asset.name}` : "—"}</p>
              <p><span className="text-muted-foreground">Created:</span> {new Date(ticket.createdAt).toLocaleString()}</p>
              {ticket.firstResponseAt && <p><span className="text-muted-foreground">First response:</span> {new Date(ticket.firstResponseAt).toLocaleString()}</p>}
              {ticket.resolvedAt && <p><span className="text-muted-foreground">Resolved:</span> {new Date(ticket.resolvedAt).toLocaleString()}</p>}
            </CardContent>
          </Card>
          <TicketActions ticketId={ticket.id} currentStatus={ticket.status} />
          <AssignControl
            ticketId={ticket.id}
            currentAssigneeId={ticket.assigneeId}
            canAssign={canAssign}
            technicians={technicians.map((t) => ({
              id: t.id,
              name: t.name ?? t.email ?? "Unknown",
            }))}
          />
          {showInternal && <WorkLogForm ticketId={ticket.id} parts={parts} />}
          <Attachments
            ticketId={ticket.id}
            canUpload={canUpload}
            initial={ticket.attachments.map((a) => ({
              id: a.id,
              fileName: a.fileName,
              fileSize: a.fileSize,
              mimeType: a.mimeType,
              storageUrl: a.storageUrl,
              createdAt: a.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
