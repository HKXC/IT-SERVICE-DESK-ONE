"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { assignTicket, addWorkLog } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AssignControl({
  ticketId,
  currentAssigneeId,
  technicians,
  canAssign,
}: {
  ticketId: string;
  currentAssigneeId: string | null;
  technicians: { id: string; name: string }[];
  canAssign: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentAssigneeId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canAssign) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Assignment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="assignee">Technician</Label>
        <div className="flex gap-2">
          <select
            id="assignee"
            value={value}
            disabled={busy}
            onChange={(e) => setValue(e.target.value)}
            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Unassigned</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await assignTicket(ticketId, value || null);
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Assign failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : "Save"}
          </Button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}

export function WorkLogForm({
  ticketId,
  parts,
}: {
  ticketId: string;
  parts: { id: string; name: string; quantity: number }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [partId, setPartId] = useState("");
  const [qty, setQty] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Add Work Log</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!body.trim()) return;
            setBusy(true);
            setError(null);
            setSuccess(null);
            try {
              await addWorkLog({
                ticketId,
                title: title.trim() || undefined,
                body: body.trim(),
                timeSpentMin: Math.max(0, Number(minutes) || 0),
                inventoryItemId: partId || undefined,
                quantityUsed: partId ? Math.max(1, Number(qty) || 1) : 0,
              });
              setTitle("");
              setBody("");
              setPartId("");
              setSuccess("Work log saved (stock updated when parts used).");
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Save failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="wl-title">Title (optional)</Label>
            <Input
              id="wl-title"
              value={title}
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What was done"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wl-body">Details *</Label>
            <Textarea
              id="wl-body"
              value={body}
              disabled={busy}
              rows={3}
              required
              onChange={(e) => setBody(e.target.value)}
              placeholder="Steps taken, findings, next actions…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="wl-min">Minutes</Label>
              <Input
                id="wl-min"
                type="number"
                min={0}
                value={minutes}
                disabled={busy}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wl-qty">Parts qty</Label>
              <Input
                id="wl-qty"
                type="number"
                min={1}
                value={qty}
                disabled={partId === "" || busy}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wl-part">Spare part used (optional — decrements stock)</Label>
            <select
              id="wl-part"
              value={partId}
              disabled={busy}
              onChange={(e) => setPartId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">No part used</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                  {p.name} (stock: {p.quantity})
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-emerald-600">{success}</p>}
          <Button size="sm" disabled={busy || !body.trim()}>
            {busy ? (
              <>
                <Loader2 className="animate-spin" aria-hidden /> Saving…
              </>
            ) : (
              "Save work log"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
