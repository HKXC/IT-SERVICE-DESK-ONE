import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const vendors = await db.vendor.findMany({ orderBy: { name: "asc" }, take: 100 });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Vendors & SLA</h1>
      <Card><CardHeader><CardTitle className="text-sm">Vendors</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {vendors.map((v) => <p key={v.id}><strong>{v.name}</strong> · {v.contactPerson ?? "—"} · {v.email ?? "—"} · {v.phone ?? "—"}</p>)}
          {vendors.length === 0 && <p className="text-muted-foreground">No vendors yet.</p>}
        </CardContent></Card>
    </div>
  );
}
