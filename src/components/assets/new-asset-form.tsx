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

export function NewAssetForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(assetCreateSchema) });

  return (
    <Card className="max-w-2xl">
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
          <Field label="Asset Number *" error={errors.assetTag?.message}>
            <Input {...register("assetTag")} placeholder="PC69-00021" />
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
          <Field label="Serial Number"><Input {...register("serialNumber")} /></Field>
          <Field label="Brand"><Input {...register("brand")} placeholder="Lenovo" /></Field>
          <Field label="Model"><Input {...register("model")} placeholder="T14 Gen 4" /></Field>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <Button disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Create Asset"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
