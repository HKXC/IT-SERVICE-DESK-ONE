"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createUser, setUserActive, changeUserRole } from "@/actions/manage";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateUserForm({
  roles,
  departments,
  locations,
}: {
  roles: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  locations: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        + New User
      </Button>
    );
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">New User</CardTitle></CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              const fd = new FormData(e.currentTarget);
              await createUser({
                name: fd.get("name") as string,
                email: fd.get("email") as string,
                password: fd.get("password") as string,
                roleId: fd.get("roleId") as string,
                departmentId: (fd.get("departmentId") as string) || undefined,
                locationId: (fd.get("locationId") as string) || undefined,
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
          <div className="space-y-1.5"><Label>Email *</Label><Input name="email" type="email" required disabled={busy} /></div>
          <div className="space-y-1.5"><Label>Password (min 8) *</Label><Input name="password" type="password" required minLength={8} disabled={busy} /></div>
          <div className="space-y-1.5"><Label>Role *</Label>
            <select name="roleId" required disabled={busy} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select></div>
          <div className="space-y-1.5"><Label>Department</Label>
            <select name="departmentId" disabled={busy} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" defaultValue="">
              <option value="">—</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select></div>
          <div className="space-y-1.5"><Label>Location</Label>
            <select name="locationId" disabled={busy} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" defaultValue="">
              <option value="">—</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select></div>
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

export function UserRowActions({
  userId,
  isActive,
  roleId,
  roles,
  isSelf,
}: {
  userId: string;
  isActive: boolean;
  roleId: string | null;
  roles: { id: string; name: string }[];
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={roleId ?? ""}
        disabled={busy || isSelf}
        title={isSelf ? "Cannot change your own role" : "Change role"}
        onChange={(e) => void run(() => changeUserRole(userId, e.target.value))}
        className="h-8 rounded-md border border-input bg-background px-1.5 text-xs"
      >
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        variant="outline"
        disabled={busy || isSelf}
        title={isSelf ? "Cannot deactivate yourself" : isActive ? "Deactivate" : "Activate"}
        onClick={() => void run(() => setUserActive(userId, !isActive))}
      >
        {isActive ? "Disable" : "Enable"}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
