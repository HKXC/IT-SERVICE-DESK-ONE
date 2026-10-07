import { hasCapability } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { NewAssetForm } from "@/components/assets/new-asset-form";

export const dynamic = "force-dynamic";

export default async function NewAssetPage() {
  if (!(await hasCapability("asset.manage"))) redirect("/assets");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">New Asset</h1>
      <NewAssetForm />
    </div>
  );
}
