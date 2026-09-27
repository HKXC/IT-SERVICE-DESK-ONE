import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { assetTag: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { serialNumber: { contains: q, mode: "insensitive" } },
    ];
  }
  if (sp.status) where.status = sp.status;
  const [total, assets] = await Promise.all([
    db.asset.count({ where: where as never }),
    db.asset.findMany({
      where: where as never,
      include: { department: true, location: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Assets ({total})</h1>
        <Link href="/assets/new"><Button>+ New Asset</Button></Link>
      </div>
      <form action="/assets" method="get" className="flex gap-2" role="search">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Tag, name, or serial…"
          aria-label="Search assets"
          className="max-w-sm"
        />
        <Button type="submit" variant="secondary">Search</Button>
        {q && <Link href="/assets" className="self-center text-sm text-[#0D9488] hover:underline">Clear</Link>}
      </form>
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
