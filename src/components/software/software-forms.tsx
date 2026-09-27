"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createSoftware, createLicense, assignLicense, revokeLicense } from "@/actions/manage";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function useAsync() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(fn: () => Promise<unknown>, onOk?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onOk?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}

export function CreateSoftwareForm() {
  const { busy, error, run } = useAsync();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        + New Software
      </Button>
    );
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">New Software</CardTitle></CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run(() =>
              createSoftware({
                name: fd.get("name") as string,
                vendor: ((fd.get("vendor") as string) || "").trim() || undefined,
                version: ((fd.get("version") as string) || "").trim() || undefined,
                category: ((fd.get("category") as string) || "").trim() || undefined,
                licenseType: ((fd.get("licenseType") as string) || "").trim() || undefined,
                description: ((fd.get("description") as string) || "").trim() || undefined,
              }), () => setOpen(false));
          }}
        >
          <div className="space-y-1.5"><Label>Name *</Label><Input name="name" required minLength={2} disabled={busy} /></div>
          <div className="space-y-1.5"><Label>Vendor</Label><Input name="vendor" disabled={busy} /></div>
          <div className="space-y-1.5"><Label>Version</Label><Input name="version" disabled={busy} /></div>
          <div className="space-y-1.5"><Label>Category</Label><Input name="category" disabled={busy} /></div>
          <div className="space-y-1.5"><Label>License type</Label><Input name="licenseType" disabled={busy} placeholder="SUBSCRIPTION / VOLUME / OEM" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Description</Label><Textarea name="description" rows={2} disabled={busy} /></div>
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

export function CreateLicenseForm({
  softwares,
  vendors,
}: {
  softwares: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
}) {
  const { busy, error, run } = useAsync();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        + New License
      </Button>
    );
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">New License</CardTitle></CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const key = ((fd.get("key") as string) || "").trim();
            void run(() =>
              createLicense({
                softwareId: fd.get("softwareId") as string,
                key: key || undefined,
                seatsTotal: Number(fd.get("seatsTotal")) || 1,
                purchaseDate: ((fd.get("purchaseDate") as string) || "") || undefined,
                expiryDate: ((fd.get("expiryDate") as string) || "") || undefined,
                cost: fd.get("cost") ? Number(fd.get("cost")) : undefined,
                vendorId: ((fd.get("vendorId") as string) || "") || undefined,
              }), () => setOpen(false));
          }}
        >
          <div className="space-y-1.5"><Label>Software *</Label>
            <select name="softwareId" required disabled={busy} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              {softwares.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
          <div className="space-y-1.5"><Label>License key</Label><Input name="key" disabled={busy} /></div>
          <div className="space-y-1.5"><Label>Seats *</Label><Input name="seatsTotal" type="number" min={1} defaultValue={1} required disabled={busy} /></div>
          <div className="space-y-1.5"><Label>Vendor</Label>
            <select name="vendorId" disabled={busy} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" defaultValue="">
              <option value="">—</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select></div>
          <div className="space-y-1.5"><Label>Purchase date</Label><Input name="purchaseDate" type="date" disabled={busy} /></div>
          <div className="space-y-1.5"><Label>Expiry date</Label><Input name="expiryDate" type="date" disabled={busy} /></div>
          <div className="space-y-1.5"><Label>Cost</Label><Input name="cost" type="number" min={0} step="0.01" disabled={busy} /></div>
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

export function AssignLicenseForm({
  licenses,
  users,
}: {
  licenses: { id: string; name: string }[];
  users: { id: string; name: string }[];
}) {
  const { busy, error, run } = useAsync();
  const [success, setSuccess] = useState<string | null>(null);
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Assign License to User</CardTitle></CardHeader>
      <CardContent>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setSuccess(null);
            void run(
              () =>
                assignLicense({
                  licenseId: fd.get("licenseId") as string,
                  userId: fd.get("userId") as string,
                }),
              () => setSuccess("License assigned.")
            );
          }}
        >
          <div className="space-y-1.5"><Label>License *</Label>
            <select name="licenseId" required disabled={busy} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              {licenses.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select></div>
          <div className="space-y-1.5"><Label>User *</Label>
            <select name="userId" required disabled={busy} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select></div>
          <Button size="sm" disabled={busy}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : "Assign"}</Button>
        </form>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        {success && <p className="mt-2 text-xs text-emerald-600">{success}</p>}
      </CardContent>
    </Card>
  );
}

export function RevokeButton({ assignmentId }: { assignmentId: string }) {
  const { busy, error, run } = useAsync();
  return (
    <span className="inline-flex items-center gap-1.5">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => {
          if (window.confirm("Revoke this license assignment?")) void run(() => revokeLicense(assignmentId));
        }}
      >
        Revoke
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
