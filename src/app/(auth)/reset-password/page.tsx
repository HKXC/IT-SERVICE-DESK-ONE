"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ResetForm() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      const r = await resetPassword(token, pw);
      setMsg(r.ok ? "Password updated. You can sign in now." : (r.error ?? "Failed"));
    }}>
      <div className="space-y-1.5"><Label>New password (min 8)</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} /></div>
      <Button className="w-full">Update password</Button>
      {msg && <p className="text-sm">{msg}</p>}
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
