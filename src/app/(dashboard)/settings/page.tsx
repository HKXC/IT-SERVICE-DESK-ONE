import { db } from "@/lib/db";
import { auth } from "@/auth";
import { hasCapability } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PolicyEditor, HolidayManager } from "@/components/settings/settings-forms";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasCapability("settings.manage"))) redirect("/");
  const [policies, holidays] = await Promise.all([
    db.sLAPolicy.findMany({ include: { businessHours: true }, orderBy: { name: "asc" } }),
    db.holiday.findMany({ orderBy: { date: "asc" }, take: 60 }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Settings</h1>
      <Card>
        <CardHeader><CardTitle className="text-sm">SLA Policies ({policies.length})</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {policies.map((p) => (
            <PolicyEditor
              key={p.id}
              policy={{
                id: p.id,
                name: p.name,
                description: p.description,
                p1ResponseMin: p.p1ResponseMin,
                p1ResolutionMin: p.p1ResolutionMin,
                p2ResponseMin: p.p2ResponseMin,
                p2ResolutionMin: p.p2ResolutionMin,
                p3ResponseMin: p.p3ResponseMin,
                p3ResolutionMin: p.p3ResolutionMin,
                p4ResponseMin: p.p4ResponseMin,
                p4ResolutionMin: p.p4ResolutionMin,
                atRiskPercent: p.atRiskPercent,
                isDefault: p.isDefault,
                isActive: p.isActive,
              }}
            />
          ))}
          {policies.length === 0 && <p className="text-sm text-muted-foreground">No policies — run seed.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Holidays ({holidays.length})</CardTitle></CardHeader>
        <CardContent>
          <HolidayManager
            holidays={holidays.map((h) => ({
              id: h.id,
              name: h.name,
              date: h.date.toISOString(),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
