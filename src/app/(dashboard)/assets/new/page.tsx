import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth-helpers";
import { NewAssetForm } from "@/components/assets/new-asset-form";

export const dynamic = "force-dynamic";

export default async function NewAssetPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission("asset.create"))) redirect("/assets");
  const [vendors, departments, locations] = await Promise.all([
    db.vendor.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.location.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">New Asset</h1>
      <NewAssetForm vendors={vendors} departments={departments} locations={locations} />
    </div>
  );
}
