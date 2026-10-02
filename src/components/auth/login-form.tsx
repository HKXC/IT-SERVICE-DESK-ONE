"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function safeCallback(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"));
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  return (
    <Card className="w-full max-w-md border-white/10 bg-[#151b19]/95 text-[#f4f5f1] shadow-[0_30px_100px_rgba(0,0,0,0.3)]">
      <CardHeader className="space-y-2 p-7 pb-5 sm:p-8 sm:pb-5">
        <CardTitle className="text-2xl tracking-tight">Welcome back</CardTitle>
        <CardDescription className="text-zinc-400">Sign in to your workspace to continue.</CardDescription>
      </CardHeader>
      <CardContent className="p-7 pt-0 sm:p-8 sm:pt-0">
        <form
          className="space-y-5"
          onSubmit={handleSubmit(async (v) => {
            setServerError(null);
            const res = await loginAction(v);
            if (res.ok) router.push(callbackUrl);
            else setServerError(res.error ?? "Sign in failed");
          })}
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" className="h-11 border-white/15 bg-black/20 text-white placeholder:text-zinc-500 focus-visible:ring-[#a9c395]" {...register("email")} />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" className="h-11 border-white/15 bg-black/20 text-white focus-visible:ring-[#a9c395]" {...register("password")} />
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input type="checkbox" {...register("rememberMe")} className="size-4 accent-[#a9c395]" /> Remember me
          </label>
          {serverError && <p className="text-sm text-red-600">{serverError}</p>}
          <Button type="submit" className="h-11 w-full rounded-lg bg-[#a9c395] font-semibold text-[#0b1110] hover:bg-[#bdd5aa]" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-sm">
            <a href="/forgot-password" className="text-[#b9d1a8] hover:underline">
              Forgot password?
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <LoginFormInner />
    </Suspense>
  );
}
