import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreateSoftwareForm,
  CreateLicenseForm,
  AssignLicenseForm,
  RevokeButton,
} from "@/components/software/software-forms";

export const dynamic = "force-dynamic";

export default async function SoftwarePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const canManage = await hasPermission("license.manage");
  const [licenses, softwares, vendors, users, assignments] = await Promise.all([
    db.license.findMany({
      include: { software: true, _count: { select: { assignments: true } } },
      orderBy: { expiryDate: "asc" },
      take: 100,
    }),
    db.software.findMany({ select: { id: true, name: true, version: true }, orderBy: { name: "asc" } }),
    db.vendor.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
    canManage
      ? db.licenseAssignment.findMany({
          where: { revokedAt: null },
          include: {
            license: { include: { software: { select: { name: true } } } },
            user: { select: { name: true, email: true } },
          },
          orderBy: { assignedAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
  ]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Software & Licenses</h1>
        {canManage && (
          <div className="flex gap-2">
            <CreateSoftwareForm />
            <CreateLicenseForm
              softwares={softwares.map((s) => ({ id: s.id, name: `${s.name} ${s.version ?? ""}`.trim() }))}
              vendors={vendors}
            />
          </div>
        )}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Licenses</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {licenses.map((l) => {
            const expiring = l.expiryDate && new Date(l.expiryDate).getTime() - Date.now() < 30 * 86400 * 1000;
            const util = l.seatsTotal ? Math.round(((l.seatsUsed || l._count.assignments) / l.seatsTotal) * 100) : 0;
            return (
              <div key={l.id} className="flex items-center justify-between border-b py-2 last:border-0">
                <div>
                  <p className="font-semibold">{l.software.name} {l.software.version ?? ""}</p>
                  <p className="text-xs text-muted-foreground">Seats {l._count.assignments}/{l.seatsTotal} ({util}%) · Expires {l.expiryDate ? new Date(l.expiryDate).toLocaleDateString() : "—"}</p>
                </div>
                {expiring ? <Badge variant="warning">Expiring</Badge> : <Badge variant="success">Active</Badge>}
              </div>
            );
          })}
          {licenses.length === 0 && <p className="text-muted-foreground">No licenses yet.</p>}
        </CardContent>
      </Card>
      {canManage && (
        <>
          <AssignLicenseForm
            licenses={licenses.map((l) => ({ id: l.id, name: `${l.software.name} (${l._count.assignments}/${l.seatsTotal})` }))}
            users={users.map((u) => ({ id: u.id, name: u.name ?? u.email ?? "Unknown" }))}
          />
          <Card>
            <CardHeader><CardTitle className="text-sm">Active Assignments ({assignments.length})</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b py-1.5 last:border-0">
                  <p className="font-mono text-xs">
                    {a.license.software.name} → {a.user.name ?? a.user.email} · {new Date(a.assignedAt).toLocaleDateString()}
                  </p>
                  <RevokeButton assignmentId={a.id} />
                </div>
              ))}
              {assignments.length === 0 && <p className="text-muted-foreground">No active assignments.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
