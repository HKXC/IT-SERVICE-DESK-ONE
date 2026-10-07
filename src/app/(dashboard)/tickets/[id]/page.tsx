import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge, Badge } from "@/components/ui/badge";
import { TicketActions } from "@/components/tickets/ticket-actions";
import { CommentBox } from "@/components/tickets/comment-box";
import { Attachments } from "@/components/tickets/attachments";
import { AssignControl, PriorityControl } from "@/components/tickets/ticket-ops";
import { getTicketTimeline } from "@/actions/tickets";
import { canViewInternalNotes, hasCapability } from "@/lib/auth-helpers";
import { formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

type StreamItem =
  | {
      kind: "comment";
      id: string;
      at: Date;
      body: string;
      author: string;
      visibility: "PUBLIC" | "INTERNAL";
    }
  | {
      kind: "event";
      id: string;
      at: Date;
      event: string;
      fromStatus: string | null;
      toStatus: string | null;
      detail: string | null;
      actor: string | null;
    };

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
      attachments: true,
    },
  });
  if (!ticket) notFound();

  const showInternal = await canViewInternalNotes();
  const canAssign = await hasCapability("ticket.assign");
  const canUpdate = await hasCapability("ticket.update");
  const canUpload =
    ticket.requesterId === session.user.id || canUpdate;
  const [technicians, timeline] = await Promise.all([
    db.user.findMany({
      where: { isActive: true, role: { name: { not: "User" } } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    getTicketTimeline(id),
  ]);

  // One ordered history: comments and status/assignment events together.
  const stream: StreamItem[] = [
    ...timeline.comments.map(
      (c): StreamItem => ({
        kind: "comment",
        id: c.id,
        at: c.createdAt,
        body: c.body,
        author: c.author?.name ?? "Unknown",
        visibility: c.type,
      })
    ),
    ...timeline.events.map(
      (e): StreamItem => ({
        kind: "event",
        id: e.id,
        at: e.createdAt,
        event: e.event,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        detail: e.detail,
        actor: e.actor?.name ?? null,
      })
    ),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

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
        <Card className="card-motion border-[#0D9488]/30">
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
          <Card className="card-motion">
            <CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-sm">{ticket.description}</p></CardContent>
          </Card>

          <Card className="card-motion">
            <CardHeader>
              <CardTitle className="text-sm">
                Activity {showInternal ? "" : "(public only)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stream.map((item) =>
                item.kind === "comment" ? (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-3 text-sm ${item.visibility === "INTERNAL" ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30" : ""}`}
                  >
                    <p className="mb-1 text-xs text-muted-foreground">
                      {item.author} · {new Date(item.at).toLocaleString()} ·{" "}
                      <Badge variant={item.visibility === "INTERNAL" ? "warning" : "info"}>
                        {item.visibility === "INTERNAL" ? "Internal" : "Public"}
                      </Badge>
                    </p>
                    <p className="whitespace-pre-wrap">{item.body}</p>
                  </div>
                ) : (
                  <div key={item.id} className="flex gap-2 text-sm">
                    <span className="text-muted-foreground">{new Date(item.at).toLocaleString()}</span>
                    <span>
                      <strong>{item.event.replaceAll("_", " ")}</strong>{" "}
                      {item.fromStatus && item.toStatus ? `${item.fromStatus} → ${item.toStatus}` : ""}
                      {item.detail ? ` · ${item.detail}` : ""}
                      {item.actor ? ` (${item.actor})` : ""}
                    </span>
                  </div>
                )
              )}
              {stream.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
              <CommentBox ticketId={ticket.id} canInternal={showInternal} />
            </CardContent>
          </Card>

        </div>

        <div className="space-y-4">
          <Card className="card-motion">
            <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Requester:</span> {ticket.requester.name} ({ticket.requester.email})</p>
              <p><span className="text-muted-foreground">Assignee:</span> {ticket.assignee?.name ?? "Unassigned"}</p>
              <p><span className="text-muted-foreground">Type:</span> {ticket.type.replaceAll("_", " ")} · {ticket.category}</p>
              <p><span className="text-muted-foreground">Priority:</span> <PriorityBadge priority={ticket.priority} /></p>
              <p><span className="text-muted-foreground">Asset:</span> {ticket.asset ? `${ticket.asset.assetTag} · ${ticket.asset.name}` : "—"}</p>
              <p><span className="text-muted-foreground">Created:</span> {new Date(ticket.createdAt).toLocaleString()}</p>
              {ticket.firstResponseAt && <p><span className="text-muted-foreground">First response:</span> {new Date(ticket.firstResponseAt).toLocaleString()}</p>}
              {ticket.resolvedAt && <p><span className="text-muted-foreground">Resolved:</span> {new Date(ticket.resolvedAt).toLocaleString()}</p>}
            </CardContent>
          </Card>
          <TicketActions ticketId={ticket.id} currentStatus={ticket.status} />
          <PriorityControl ticketId={ticket.id} currentPriority={ticket.priority} canEdit={canUpdate} />
          <AssignControl
            ticketId={ticket.id}
            currentAssigneeId={ticket.assigneeId}
            canAssign={canAssign}
            technicians={technicians.map((t) => ({
              id: t.id,
              name: t.name ?? t.email ?? "Unknown",
            }))}
          />
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
