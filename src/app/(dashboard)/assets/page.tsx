import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const assets = await db.asset.findMany({
    include: { department: true, location: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Assets ({assets.length})</h1>
        <Link href="/assets/new"><Button>+ New Asset</Button></Link>
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-2.5">Tag</th><th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Type</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Dept</th><th className="px-4 py-2.5">Warranty</th></tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-2.5 font-mono text-xs"><Link className="text-[#0D9488] hover:underline" href={`/assets/${a.id}`}>{a.assetTag}</Link></td>
                  <td className="px-4 py-2.5">{a.name}</td>
                  <td className="px-4 py-2.5">{a.type}</td>
                  <td className="px-4 py-2.5"><Badge variant="secondary">{a.status.replaceAll("_", " ")}</Badge></td>
                  <td className="px-4 py-2.5">{a.department?.name ?? "—"}</td>
                  <td className="px-4 py-2.5">{a.warrantyEnd ? new Date(a.warrantyEnd).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
              {assets.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No assets. Create the first one.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
