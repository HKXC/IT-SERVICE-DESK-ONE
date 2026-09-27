"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createInventoryItem, adjustStock } from "@/actions/assets";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateItemForm({
  locations,
  vendors,
}: {
  locations: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ sku: "", name: "", category: "RAM", quantity: "0", minStock: "5" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((v) => ({ ...v, [k]: e.target.value }));

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        + New Item
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">New Inventory Item</CardTitle></CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              const fd = new FormData(e.currentTarget);
              await createInventoryItem({
                sku: f.sku,
                name: f.name,
                category: f.category,
                brand: (fd.get("brand") as string) || undefined,
                model: (fd.get("model") as string) || undefined,
                quantity: Number(f.quantity) || 0,
                minStock: Number(f.minStock) || 0,
                locationId: (fd.get("locationId") as string) || undefined,
                vendorId: (fd.get("vendorId") as string) || undefined,
              });
              setOpen(false);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Create failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="space-y-1.5"><Label>SKU *</Label><Input value={f.sku} disabled={busy} required onChange={set("sku")} placeholder="RAM-16G-DDR4" /></div>
          <div className="space-y-1.5"><Label>Name *</Label><Input value={f.name} disabled={busy} required onChange={set("name")} /></div>
          <div className="space-y-1.5"><Label>Category *</Label>
            <select value={f.category} disabled={busy} onChange={set("category")} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              {["RAM", "SSD", "HDD", "Battery", "Adapter", "Mouse", "Keyboard", "Monitor", "LAN Cable", "Network Equipment", "Spare Notebook", "Other Parts"].map((c) => <option key={c}>{c}</option>)}
            </select></div>
          <div className="space-y-1.5"><Label>Brand</Label><Input name="brand" disabled={busy} /></div>
          <div className="space-y-1.5"><Label>Model</Label><Input name="model" disabled={busy} /></div>
          <div className="space-y-1.5"><Label>Quantity</Label><Input value={f.quantity} disabled={busy} type="number" min={0} onChange={set("quantity")} /></div>
          <div className="space-y-1.5"><Label>Min Stock</Label><Input value={f.minStock} disabled={busy} type="number" min={0} onChange={set("minStock")} /></div>
          <div className="space-y-1.5"><Label>Location</Label>
            <select name="locationId" disabled={busy} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" defaultValue="">
              <option value="">—</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select></div>
          <div className="space-y-1.5"><Label>Vendor</Label>
            <select name="vendorId" disabled={busy} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" defaultValue="">
              <option value="">—</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select></div>
          {error && <p className="text-xs text-red-600 sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Button size="sm" disabled={busy}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : "Create"}</Button>
            <Button size="sm" variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function AdjustForm({ items }: { items: { id: string; name: string; quantity: number }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Adjust Stock</CardTitle></CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            setSuccess(null);
            try {
              const fd = new FormData(e.currentTarget);
              const type = fd.get("type") as string;
              const qty = Number(fd.get("quantity"));
              if (!Number.isInteger(qty) || qty === 0) throw new Error("Quantity must be a non-zero integer");
              await adjustStock({
                itemId: fd.get("itemId") as string,
                type: type as "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT" | "REPAIR_USAGE" | "RETURN",
                quantity: type === "ADJUSTMENT" ? qty : Math.abs(qty),
                reason: ((fd.get("reason") as string) || "").slice(0, 500) || undefined,
              });
              setSuccess("Stock updated.");
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Adjustment failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="space-y-1.5"><Label>Item *</Label>
            <select name="itemId" required disabled={busy} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              {items.map((i) => <option key={i.id} value={i.id}>{i.name} (stock: {i.quantity})</option>)}
            </select></div>
          <div className="space-y-1.5"><Label>Type *</Label>
            <select name="type" disabled={busy} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option value="STOCK_IN">Stock In (+)</option>
              <option value="STOCK_OUT">Stock Out (−)</option>
              <option value="ADJUSTMENT">Adjustment (signed)</option>
              <option value="RETURN">Return (+)</option>
            </select></div>
          <div className="space-y-1.5"><Label>Quantity *</Label><Input name="quantity" type="number" required disabled={busy} placeholder="e.g. 5 or -2 for adjustment" /></div>
          <div className="space-y-1.5"><Label>Reason</Label><Input name="reason" disabled={busy} maxLength={500} /></div>
          {error && <p className="text-xs text-red-600 sm:col-span-2">{error}</p>}
          {success && <p className="text-xs text-emerald-600 sm:col-span-2">{success}</p>}
          <div className="sm:col-span-2">
            <Button size="sm" disabled={busy}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : "Apply"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
