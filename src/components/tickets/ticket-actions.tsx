"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeTicketStatus } from "@/actions/tickets";
import { TICKET_TRANSITIONS } from "@/lib/workflow";
import type { TicketStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TicketActions({
  ticketId,
  currentStatus,
}: {
  ticketId: string;
  currentStatus: TicketStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = TICKET_TRANSITIONS[currentStatus] ?? [];

  async function go(to: TicketStatus) {
    setBusy(true);
    setError(null);
    try {
      await changeTicketStatus(ticketId, to);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transition failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Workflow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">Current: {currentStatus.replaceAll("_", " ")}</p>
        <div className="flex flex-wrap gap-2">
          {next.map((s) => (
            <Button key={s} size="sm" variant="outline" disabled={busy} onClick={() => go(s)}>
              → {s.replaceAll("_", " ")}
            </Button>
          ))}
          {next.length === 0 && <p className="text-sm text-muted-foreground">No further transitions.</p>}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
