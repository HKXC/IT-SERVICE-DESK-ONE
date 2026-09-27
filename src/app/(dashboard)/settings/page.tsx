import { db } from "@/lib/db";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission("settings.manage"))) redirect("/");
  const [policies, settings, holidays] = await Promise.all([
    db.sLAPolicy.findMany({ include: { businessHours: true } }),
    db.systemSetting.findMany(),
    db.holiday.findMany({ orderBy: { date: "asc" }, take: 30 }),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Settings</h1>
      <Card><CardHeader><CardTitle className="text-sm">SLA Policies (configurable targets)</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {policies.map((p) => <p key={p.id}><strong>{p.name}</strong> {p.isDefault ? "(default)" : ""} · P1 {p.p1ResponseMin}m/{p.p1ResolutionMin}m · P2 {p.p2ResponseMin}m/{p.p2ResolutionMin}m · P3 {p.p3ResponseMin}m/{p.p3ResolutionMin}m · P4 {p.p4ResponseMin}m/{p.p4ResolutionMin}m · at-risk {p.atRiskPercent}%</p>)}
          {policies.length === 0 && <p className="text-muted-foreground">No policies — run seed.</p>}
        </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">Priority Matrix (SystemSetting: priority_matrix)</CardTitle></CardHeader>
        <CardContent className="text-sm"><pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{JSON.stringify(settings.find((s) => s.key === "priority_matrix")?.value ?? "default matrix active", null, 2)}</pre></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">Holidays ({holidays.length})</CardTitle></CardHeader>
        <CardContent className="text-sm">{holidays.map((h) => <p key={h.id}>{new Date(h.date).toLocaleDateString()} · {h.name}</p>)}</CardContent></Card>
    </div>
  );
}
