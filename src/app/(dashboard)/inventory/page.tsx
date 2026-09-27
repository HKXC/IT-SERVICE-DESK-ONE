import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const [items, txns] = await Promise.all([
    db.inventoryItem.findMany({ orderBy: { updatedAt: "desc" }, take: 100 }),
    db.stockTransaction.findMany({
      include: { item: { select: { name: true, sku: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Inventory & Spare Parts</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Stock Levels</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {items.map((i) => (
              <div key={i.id} className="flex items-center justify-between border-b py-1.5 last:border-0">
                <div><p className="font-semibold">{i.name} <span className="font-mono text-xs text-muted-foreground">{i.sku}</span></p>
                <p className="text-xs text-muted-foreground">{i.category} · min {i.minStock}</p></div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{i.quantity}</span>
                  {i.quantity <= 0 ? <Badge variant="danger">Out</Badge> : i.quantity <= i.minStock ? <Badge variant="warning">Low</Badge> : <Badge variant="success">OK</Badge>}
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="text-muted-foreground">No inventory yet — seed data or add via API.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Stock Transactions</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {txns.map((t) => (
              <p key={t.id} className="font-mono text-xs">{new Date(t.createdAt).toLocaleString()} · {t.type} · {t.quantity > 0 ? "+" : ""}{t.quantity} · {t.item.sku} ({t.quantityBefore}→{t.quantityAfter})</p>
            ))}
            {txns.length === 0 && <p className="text-muted-foreground">No transactions.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
