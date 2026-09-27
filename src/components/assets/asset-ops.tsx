"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { changeAssetStatus, assignAsset } from "@/actions/assets";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUSES = [
  "REQUESTED",
  "PURCHASED",
  "RECEIVED",
  "IN_STOCK",
  "ASSIGNED",
  "IN_USE",
  "REPAIR",
  "MAINTENANCE",
  "TRANSFER",
  "RESERVED",
  "LOST",
  "RETIRED",
  "DISPOSED",
] as const;

export function AssetOps({
  assetId,
  currentStatus,
  assignedUserId,
  users,
  canUpdate,
  canAssign,
  showRetire,
  showDispose,
}: {
  assetId: string;
  currentStatus: string;
  assignedUserId: string | null;
  users: { id: string; name: string }[];
  canUpdate: boolean;
  canAssign: boolean;
  showRetire: boolean;
  showDispose: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [cost, setCost] = useState("");
  const [assignee, setAssignee] = useState(assignedUserId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>, okMsg: string) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await fn();
      setSuccess(okMsg);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }

  if (!canUpdate && !canAssign) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Manage Asset</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canUpdate && (
          <div className="space-y-2">
            <Label htmlFor="asset-status">Status (current: {currentStatus.replaceAll("_", " ")})</Label>
            <div className="flex gap-2">
              <select
                id="asset-status"
                value={status}
                disabled={busy}
                onChange={(e) => setStatus(e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              >
                {STATUSES.filter(
                  (s) =>
                    (s !== "RETIRED" || showRetire) &&
                    (s !== "DISPOSED" || showDispose)
                ).map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={busy || status === currentStatus}
                onClick={() =>
                  run(
                    () =>
                      changeAssetStatus(
                        assetId,
                        status as (typeof STATUSES)[number],
                        note.trim() || undefined,
                        cost ? Number(cost) : undefined
                      ),
                    "Status updated."
                  )
                }
              >
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : "Apply"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={note}
                disabled={busy}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optional)"
                aria-label="Status change note"
              />
              <Input
                value={cost}
                disabled={busy}
                type="number"
                min={0}
                onChange={(e) => setCost(e.target.value)}
                placeholder="Cost (optional)"
                aria-label="Repair cost"
              />
            </div>
          </div>
        )}

        {canAssign && (
          <div className="space-y-2 border-t pt-3">
            <Label htmlFor="asset-assignee">Assign to user</Label>
            <div className="flex gap-2">
              <select
                id="asset-assignee"
                value={assignee}
                disabled={busy}
                onChange={(e) => setAssignee(e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">Return to stock</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  run(
                    () => assignAsset(assetId, assignee || null, note.trim() || undefined),
                    assignee ? "Asset assigned." : "Returned to stock."
                  )
                }
              >
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : "Save"}
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
        {success && <p className="text-xs text-emerald-600">{success}</p>}
      </CardContent>
    </Card>
  );
}
