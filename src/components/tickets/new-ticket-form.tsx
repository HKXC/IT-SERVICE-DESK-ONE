"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ticketCreateSchema, type TicketCreateInput } from "@/lib/validations";
import { createTicket } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewTicketForm({
  assets,
}: {
  assets: { id: string; assetTag: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TicketCreateInput>({
    resolver: zodResolver(ticketCreateSchema),
    defaultValues: { priority: "MEDIUM", type: "INCIDENT", category: "Hardware" },
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
              const r = await createTicket(v);
              router.push(`/tickets/${r.id}`);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to create ticket");
            }
          })}
        >
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
                <option value="SERVICE_REQUEST">Request</option>
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
              <Label>Priority</Label>
              <select {...register("priority")} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Related asset (optional)</Label>
              <select {...register("assetId")} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" defaultValue="">
                <option value="">— None —</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assetTag} · {a.name}
                  </option>
                ))}
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
            Priority is set directly. SLA deadlines attach automatically.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
