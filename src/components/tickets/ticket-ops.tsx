"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { assignTicket, changePriority } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
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

export function PriorityControl({
  ticketId,
  currentPriority,
  canEdit,
}: {
  ticketId: string;
  currentPriority: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentPriority);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Priority</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="priority">Set priority</Label>
        <div className="flex gap-2">
          <select
            id="priority"
            value={value}
            disabled={busy}
            onChange={(e) => setValue(e.target.value)}
            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <Button
            size="sm"
            disabled={busy || value === currentPriority}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await changePriority(ticketId, value);
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Change failed");
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
