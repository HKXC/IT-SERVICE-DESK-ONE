import { db } from "@/lib/db";
import { NewTicketForm } from "@/components/tickets/new-ticket-form";

export const dynamic = "force-dynamic";

export default async function NewTicketPage() {
  const assets = await db.asset.findMany({
    select: { id: true, assetTag: true, name: true },
    orderBy: { assetTag: "asc" },
    take: 500,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">New Ticket</h1>
      <NewTicketForm assets={assets} />
    </div>
  );
}
