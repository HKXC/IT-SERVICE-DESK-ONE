"use client";
import { useState } from "react";
import { requestPasswordReset } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1E3A5F] p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Forgot password</CardTitle></CardHeader>
        <CardContent>
          {done ? (
            <p className="text-sm">If an account exists for that email, a reset link was created. Check with your IT admin (email provider configured at deploy time).</p>
          ) : (
            <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); await requestPasswordReset(email); setDone(true); }}>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <Button className="w-full">Send reset link</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
