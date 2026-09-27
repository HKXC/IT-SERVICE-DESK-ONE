"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-4 dark:bg-[#0B1220]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-5 text-amber-600" aria-hidden />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            The page failed to load. Your data is safe — try again.
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>
          )}
          <div className="flex gap-2">
            <Button onClick={() => reset()}>Retry</Button>
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              Go to dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
