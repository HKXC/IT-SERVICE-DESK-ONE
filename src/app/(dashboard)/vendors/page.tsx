import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateVendorForm, DeleteVendorButton } from "@/components/vendors/vendor-forms";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const canManage = await hasPermission("vendor.manage");
  if (!canManage) redirect("/");
  const vendors = await db.vendor.findMany({
    include: { _count: { select: { assets: true, inventoryItems: true, licenses: true } } },
    orderBy: { name: "asc" },
    take: 100,
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Vendors & SLA</h1>
        <CreateVendorForm />
      </div>
      <Card><CardHeader><CardTitle className="text-sm">Vendors ({vendors.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {vendors.map((v) => {
            const refs = v._count.assets + v._count.inventoryItems + v._count.licenses;
            return (
              <div key={v.id} className="flex items-center justify-between gap-2 border-b py-2 last:border-0">
                <p>
                  <strong>{v.name}</strong> · {v.contactPerson ?? "—"} · {v.email ?? "—"} · {v.phone ?? "—"}
                  {refs > 0 && <span className="ml-2 text-xs text-muted-foreground">({refs} linked)</span>}
                </p>
                <DeleteVendorButton vendorId={v.id} name={v.name} />
              </div>
            );
          })}
          {vendors.length === 0 && <p className="text-muted-foreground">No vendors yet. Add the first one above.</p>}
        </CardContent></Card>
    </div>
  );
}
