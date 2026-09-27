import { db } from "@/lib/db";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PolicyEditor, MatrixEditor, HolidayManager } from "@/components/settings/settings-forms";

export const dynamic = "force-dynamic";

const DEFAULT_MATRIX: Record<string, string> = {
  "HIGH:HIGH": "P1",
  "HIGH:MEDIUM": "P2",
  "HIGH:LOW": "P2",
  "MEDIUM:HIGH": "P2",
  "MEDIUM:MEDIUM": "P3",
  "MEDIUM:LOW": "P3",
  "LOW:HIGH": "P3",
  "LOW:MEDIUM": "P4",
  "LOW:LOW": "P4",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission("settings.manage"))) redirect("/");
  const [policies, settings, holidays] = await Promise.all([
    db.sLAPolicy.findMany({ include: { businessHours: true }, orderBy: { name: "asc" } }),
    db.systemSetting.findMany(),
    db.holiday.findMany({ orderBy: { date: "asc" }, take: 60 }),
  ]);
  const stored = settings.find((s) => s.key === "priority_matrix")?.value as
    | Record<string, string>
    | null
    | undefined;
  const matrix = { ...DEFAULT_MATRIX, ...(stored ?? {}) };

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
        <CardHeader><CardTitle className="text-sm">Priority Matrix (Impact × Urgency → Priority)</CardTitle></CardHeader>
        <CardContent>
          <MatrixEditor initial={matrix} />
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
