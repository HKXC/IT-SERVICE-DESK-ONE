"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { saveSLAPolicy, savePriorityMatrix, addHoliday, deleteHoliday } from "@/actions/manage";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function useAsync() {
  const router = useRouter();
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
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, success, run };
}

export type PolicyShape = {
  id: string;
  name: string;
  description: string | null;
  p1ResponseMin: number;
  p1ResolutionMin: number;
  p2ResponseMin: number;
  p2ResolutionMin: number;
  p3ResponseMin: number;
  p3ResolutionMin: number;
  p4ResponseMin: number;
  p4ResolutionMin: number;
  atRiskPercent: number;
  isDefault: boolean;
  isActive: boolean;
};

const NUMS: { key: keyof PolicyShape; label: string }[] = [
  { key: "p1ResponseMin", label: "P1 response (min)" },
  { key: "p1ResolutionMin", label: "P1 resolution (min)" },
  { key: "p2ResponseMin", label: "P2 response (min)" },
  { key: "p2ResolutionMin", label: "P2 resolution (min)" },
  { key: "p3ResponseMin", label: "P3 response (min)" },
  { key: "p3ResolutionMin", label: "P3 resolution (min)" },
  { key: "p4ResponseMin", label: "P4 response (min)" },
  { key: "p4ResolutionMin", label: "P4 resolution (min)" },
  { key: "atRiskPercent", label: "At-risk threshold (%)" },
];

export function PolicyEditor({ policy }: { policy: PolicyShape }) {
  const { busy, error, success, run } = useAsync();
  return (
    <form
      className="space-y-3 border-t pt-3 first:border-0 first:pt-0"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const payload: Record<string, unknown> = {
          name: fd.get("name") as string,
          description: ((fd.get("description") as string) || "").trim() || undefined,
          isDefault: fd.get("isDefault") === "on",
          isActive: fd.get("isActive") === "on",
        };
        for (const n of NUMS) payload[n.key] = Number(fd.get(n.key));
        void run(() => saveSLAPolicy(policy.id, payload), `Saved ${payload.name}.`);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Name *</Label><Input name="name" required defaultValue={policy.name} disabled={busy} /></div>
        <div className="space-y-1.5"><Label>Description</Label><Input name="description" defaultValue={policy.description ?? ""} disabled={busy} /></div>
        {NUMS.map((n) => (
          <div key={n.key} className="space-y-1.5">
            <Label>{n.label} *</Label>
            <Input name={n.key} type="number" min={1} required defaultValue={policy[n.key] as number} disabled={busy} />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="isDefault" defaultChecked={policy.isDefault} disabled={busy} className="size-4" /> Default policy
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="isActive" defaultChecked={policy.isActive} disabled={busy} className="size-4" /> Active
        </label>
        <Button size="sm" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : "Save policy"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-emerald-600">{success}</p>}
    </form>
  );
}

const LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;

export function MatrixEditor({ initial }: { initial: Record<string, string> }) {
  const { busy, error, success, run } = useAsync();
  const [matrix, setMatrix] = useState<Record<string, string>>(initial);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void run(() => savePriorityMatrix(matrix), "Priority matrix saved.");
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="py-1.5">Impact × Urgency</th>
              {LEVELS.map((u) => (
                <th key={u} className="py-1.5">{u}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LEVELS.map((impact) => (
              <tr key={impact} className="border-t">
                <td className="py-1.5 font-medium">{impact}</td>
                {LEVELS.map((urgency) => {
                  const k = `${impact}:${urgency}`;
                  return (
                    <td key={k} className="py-1.5 pr-2">
                      <select
                        value={matrix[k] ?? "P3"}
                        disabled={busy}
                        aria-label={`Priority for ${impact} impact, ${urgency} urgency`}
                        onChange={(e) => setMatrix((m) => ({ ...m, [k]: e.target.value }))}
                        className="h-8 rounded-md border border-input bg-background px-1.5 text-xs"
                      >
                        <option>P1</option><option>P2</option><option>P3</option><option>P4</option>
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-emerald-600">{success}</p>}
      <Button size="sm" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : "Save matrix"}
      </Button>
    </form>
  );
}

export function HolidayManager({ holidays }: { holidays: { id: string; name: string; date: string }[] }) {
  const { busy, error, success, run } = useAsync();
  return (
    <div className="space-y-3">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void run(
            () =>
              addHoliday({ name: fd.get("name") as string, date: fd.get("date") as string }),
            "Holiday added."
          );
        }}
      >
        <div className="space-y-1.5"><Label>Date *</Label><Input name="date" type="date" required disabled={busy} /></div>
        <div className="space-y-1.5"><Label>Name *</Label><Input name="name" required minLength={2} disabled={busy} placeholder="Songkran" /></div>
        <Button size="sm" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : "Add"}
        </Button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-emerald-600">{success}</p>}
      <ul className="space-y-1 text-sm">
        {holidays.map((h) => (
          <li key={h.id} className="flex items-center justify-between border-b py-1.5 last:border-0">
            <span>{new Date(h.date).toLocaleDateString()} · {h.name}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              aria-label={`Delete holiday ${h.name}`}
              onClick={() => void run(() => deleteHoliday(h.id), "Deleted.")}
            >
              <Trash2 className="size-3.5" aria-hidden />
            </Button>
          </li>
        ))}
        {holidays.length === 0 && <li className="text-muted-foreground">No holidays configured.</li>}
      </ul>
    </div>
  );
}
