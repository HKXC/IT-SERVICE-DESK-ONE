import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function StockTxnsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const txns = await db.stockTransaction.findMany({
    include: { item: { select: { name: true, sku: true } }, ticket: { select: { ticketNo: true } } },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Stock Transactions</h1>
      <Card><CardHeader><CardTitle className="text-sm">Latest 100</CardTitle></CardHeader>
        <CardContent className="space-y-1.5 font-mono text-xs">
          {txns.map((t) => <p key={t.id}>{new Date(t.createdAt).toLocaleString()} · {t.type} · {t.quantity > 0 ? "+" : ""}{t.quantity} · {t.item.sku} ({t.quantityBefore}→{t.quantityAfter}) {t.ticket ? `· ${t.ticket.ticketNo}` : ""} {t.reason ? `· ${t.reason}` : ""}</p>)}
          {txns.length === 0 && <p>No transactions.</p>}
        </CardContent></Card>
    </div>
  );
}
