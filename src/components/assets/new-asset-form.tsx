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

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

const inputCls = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

export function NewAssetForm({
  vendors,
  departments,
  locations,
}: {
  vendors: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  locations: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(assetCreateSchema) });

  return (
    <Card className="max-w-3xl">
      <CardHeader><CardTitle>New Asset</CardTitle></CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={handleSubmit(async (v) => {
            setError(null);
            try {
              const r = await createAsset(v);
              router.push(`/assets/${r.id}`);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed");
            }
          })}
        >
          <Field label="Asset Tag *" error={errors.assetTag?.message}>
            <Input {...register("assetTag")} placeholder="AST-0001" />
          </Field>
          <Field label="Name *" error={errors.name?.message}>
            <Input {...register("name")} placeholder="ThinkPad T14" />
          </Field>
          <Field label="Type">
            <select {...register("type")} className={inputCls}>
              <option>COMPUTER</option><option>SERVER</option><option>NETWORK</option>
              <option>PRINTER</option><option>MOBILE</option><option>OTHER</option>
            </select>
          </Field>
          <Field label="Category"><Input {...register("category")} placeholder="Notebook" /></Field>
          <Field label="Serial Number"><Input {...register("serialNumber")} /></Field>
          <Field label="Manufacturer"><Input {...register("manufacturer")} placeholder="Lenovo" /></Field>
          <Field label="Brand"><Input {...register("brand")} /></Field>
          <Field label="Model"><Input {...register("model")} /></Field>
          <Field label="CPU"><Input {...register("cpu")} placeholder="i7-1355U" /></Field>
          <Field label="RAM"><Input {...register("ram")} placeholder="16GB" /></Field>
          <Field label="Storage"><Input {...register("storage")} placeholder="512GB SSD" /></Field>
          <Field label="GPU"><Input {...register("gpu")} /></Field>
          <Field label="OS"><Input {...register("os")} placeholder="Windows 11" /></Field>
          <Field label="OS Version"><Input {...register("osVersion")} /></Field>
          <Field label="Hostname"><Input {...register("hostname")} /></Field>
          <Field label="IP Address"><Input {...register("ipAddress")} placeholder="192.168.1.50" /></Field>
          <Field label="MAC Address"><Input {...register("macAddress")} /></Field>
          <Field label="Purchase Date"><Input {...register("purchaseDate")} type="date" /></Field>
          <Field label="Purchase Price" error={errors.purchasePrice?.message}>
            <Input {...register("purchasePrice")} type="number" min={0} step="0.01" />
          </Field>
          <Field label="Warranty Start"><Input {...register("warrantyStart")} type="date" /></Field>
          <Field label="Warranty End"><Input {...register("warrantyEnd")} type="date" /></Field>
          <Field label="Vendor">
            <select {...register("vendorId")} className={inputCls} defaultValue="">
              <option value="">— None —</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Field>
          <Field label="Department">
            <select {...register("departmentId")} className={inputCls} defaultValue="">
              <option value="">— None —</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Location">
            <select {...register("locationId")} className={inputCls} defaultValue="">
              <option value="">— None —</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <Button disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Create Asset"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
