import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const rows = await db.assetAssignment.findMany({
    include: { asset: { select: { assetTag: true, name: true } }, user: { select: { name: true, email: true } } },
    orderBy: { assignedAt: "desc" }, take: 100,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Asset Assignments</h1>
      <Card><CardHeader><CardTitle className="text-sm">Latest 100</CardTitle></CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {rows.map((r) => <p key={r.id} className="font-mono text-xs">{r.asset.assetTag} → {r.user.email} · {new Date(r.assignedAt).toLocaleDateString()} {r.returnedAt ? `(returned ${new Date(r.returnedAt).toLocaleDateString()})` : "(active)"}</p>)}
          {rows.length === 0 && <p className="text-muted-foreground">No assignments.</p>}
        </CardContent></Card>
    </div>
  );
}
