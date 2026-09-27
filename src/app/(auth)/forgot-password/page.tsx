"use client";
import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { requestPasswordReset } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1E3A5F] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>We’ll create a reset link if the account exists.</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-3 text-sm">
              <p>
                If an account exists for <strong>{email}</strong>, a reset link was
                created. Ask your IT admin for the link (email delivery is configured
                at deploy time).
              </p>
              <Link href="/login" className="text-[#0D9488] hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError(null);
                try {
                  await requestPasswordReset(email);
                  setDone(true);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Request failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="fp-email">Email</Label>
                <Input
                  id="fp-email"
                  type="email"
                  required
                  disabled={busy}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button className="w-full" disabled={busy || !email.trim()}>
                {busy ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden /> Sending…
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
