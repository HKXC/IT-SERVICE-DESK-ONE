"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ticketCreateSchema, type TicketCreateInput } from "@/lib/validations";
import { createTicket } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function NewTicketFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assetId = searchParams.get("assetId");
  const [error, setError] = useState<string | null>(null);
  const [linkedAsset, setLinkedAsset] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) return;
    fetch(`/api/public/assets/${assetId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const a = j?.data;
        if (a) setLinkedAsset(`${a.assetTag} · ${a.name}`);
      })
      .catch(() => undefined);
  }, [assetId]);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TicketCreateInput>({
    resolver: zodResolver(ticketCreateSchema),
    defaultValues: { impact: "MEDIUM", urgency: "MEDIUM", type: "INCIDENT", category: "Hardware" },
  });

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Create Ticket</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (v) => {
            setError(null);
            try {
              const r = await createTicket(assetId ? { ...v, assetId } : v);
              router.push(`/tickets/${r.id}`);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to create ticket");
            }
          })}
        >
          {assetId && (
            <div className="flex items-center gap-2 rounded-lg border border-[#0D9488]/30 bg-teal-50 p-3 text-sm dark:bg-teal-950/30">
              <span className="text-muted-foreground">Linked asset:</span>
              <Badge variant="secondary">{linkedAsset ?? "loading…"}</Badge>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input {...register("title")} placeholder="e.g. Laptop won't boot after update" />
            {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select {...register("type")} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="INCIDENT">Incident</option>
                <option value="SERVICE_REQUEST">Service Request</option>
                <option value="REPAIR">Repair</option>
                <option value="PROBLEM">Problem</option>
                <option value="CHANGE_REQUEST">Change Request</option>
                <option value="ACCESS_REQUEST">Access Request</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select {...register("category")} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option>Hardware</option>
                <option>Software</option>
                <option>Network</option>
                <option>Access</option>
                <option>Email</option>
                <option>Printer</option>
                <option>Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Impact</Label>
              <select {...register("impact")} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option>HIGH</option>
                <option>MEDIUM</option>
                <option>LOW</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Urgency</Label>
              <select {...register("urgency")} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option>HIGH</option>
                <option>MEDIUM</option>
                <option>LOW</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea {...register("description")} rows={6} placeholder="Describe symptoms, error messages, steps to reproduce…" />
            {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create Ticket"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Priority is auto-derived from Impact × Urgency matrix. SLA deadlines attach automatically.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export function NewTicketForm() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <NewTicketFormInner />
    </Suspense>
  );
}
