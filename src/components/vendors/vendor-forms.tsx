"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { createVendor, deleteVendor } from "@/actions/assets";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateVendorForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        + New Vendor
      </Button>
    );
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">New Vendor</CardTitle></CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              const fd = new FormData(e.currentTarget);
              const email = (fd.get("email") as string).trim();
              await createVendor({
                name: fd.get("name") as string,
                contactPerson: ((fd.get("contactPerson") as string) || "").trim() || undefined,
                email: email || undefined,
                phone: ((fd.get("phone") as string) || "").trim() || undefined,
                address: ((fd.get("address") as string) || "").trim() || undefined,
                taxId: ((fd.get("taxId") as string) || "").trim() || undefined,
              });
              setOpen(false);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Create failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="space-y-1.5"><Label>Name *</Label><Input name="name" required minLength={2} disabled={busy} /></div>
          <div className="space-y-1.5"><Label>Contact person</Label><Input name="contactPerson" disabled={busy} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input name="email" type="email" disabled={busy} /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input name="phone" disabled={busy} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Address</Label><Input name="address" disabled={busy} /></div>
          <div className="space-y-1.5"><Label>Tax ID</Label><Input name="taxId" disabled={busy} /></div>
          {error && <p className="text-xs text-red-600 sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Button size="sm" disabled={busy}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : "Create"}</Button>
            <Button size="sm" variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function DeleteVendorButton({ vendorId, name }: { vendorId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-1.5">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        aria-label={`Delete vendor ${name}`}
        onClick={async () => {
          if (!window.confirm(`Delete vendor "${name}"?`)) return;
          setBusy(true);
          setError(null);
          try {
            await deleteVendor(vendorId);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Delete failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
