import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function SoftwarePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const licenses = await db.license.findMany({
    include: { software: true, _count: { select: { assignments: true } } },
    orderBy: { expiryDate: "asc" },
    take: 100,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Software & Licenses</h1>
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
    </div>
  );
}
