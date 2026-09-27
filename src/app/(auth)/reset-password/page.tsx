"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { resetPassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">Missing reset token</p>
          <p>Open the full reset link from your IT admin, or request a new one.</p>
          <Link href="/forgot-password" className="text-[#0D9488] hover:underline">
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          <p>Password updated.</p>
        </div>
        <Button
          className="w-full"
          onClick={() => router.push("/login")}
        >
          Go to sign in
        </Button>
      </div>
    );
  }

  const mismatch = pw.length > 0 && pw2.length > 0 && pw !== pw2;

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (mismatch || pw.length < 8) return;
        setBusy(true);
        setError(null);
        try {
          const r = await resetPassword(token, pw);
          if (r.ok) setDone(true);
          else setError(r.error ?? "Reset failed");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Reset failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="np">New password (min 8 characters)</Label>
        <Input
          id="np"
          type="password"
          required
          minLength={8}
          disabled={busy}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="np2">Confirm password</Label>
        <Input
          id="np2"
          type="password"
          required
          disabled={busy}
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
        />
        {mismatch && <p className="text-xs text-red-600">Passwords do not match.</p>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button className="w-full" disabled={busy || mismatch || pw.length < 8}>
        {busy ? (
          <>
            <Loader2 className="animate-spin" aria-hidden /> Updating…
          </>
        ) : (
          "Update password"
        )}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1E3A5F] p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Reset password</CardTitle></CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
            <ResetForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
