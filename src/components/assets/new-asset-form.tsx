"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { assetCreateSchema } from "@/lib/validations";
import { z } from "zod";
import { createAsset } from "@/actions/assets";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Form = z.infer<typeof assetCreateSchema>;

export function NewAssetForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(assetCreateSchema),
  });
  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>New Asset</CardTitle></CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(async (v) => {
          setError(null);
          try { const r = await createAsset(v); router.push(`/assets/${r.id}`); }
          catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
        })}>
          <div className="space-y-1.5"><Label>Asset Tag *</Label><Input {...register("assetTag")} placeholder="AST-0001" /></div>
          <div className="space-y-1.5"><Label>Name *</Label><Input {...register("name")} placeholder="ThinkPad T14" /></div>
          <div className="space-y-1.5"><Label>Type</Label>
            <select {...register("type")} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option>COMPUTER</option><option>SERVER</option><option>NETWORK</option><option>PRINTER</option><option>MOBILE</option><option>OTHER</option>
            </select></div>
          <div className="space-y-1.5"><Label>Serial Number</Label><Input {...register("serialNumber")} /></div>
          <div className="space-y-1.5"><Label>Brand</Label><Input {...register("brand")} /></div>
          <div className="space-y-1.5"><Label>Model</Label><Input {...register("model")} /></div>
          <div className="space-y-1.5"><Label>CPU</Label><Input {...register("cpu")} /></div>
          <div className="space-y-1.5"><Label>RAM</Label><Input {...register("ram")} /></div>
          <div className="space-y-1.5"><Label>OS</Label><Input {...register("os")} /></div>
          <div className="space-y-1.5"><Label>Hostname</Label><Input {...register("hostname")} /></div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2"><Button disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Create Asset"}</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}
