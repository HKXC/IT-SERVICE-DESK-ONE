import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-4 dark:bg-[#0B1220]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-base">
            <SearchX className="size-5 text-muted-foreground" aria-hidden />
            Page not found
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="font-mono text-4xl font-bold text-muted-foreground">404</p>
          <p className="text-muted-foreground">This page doesn’t exist or was moved.</p>
          <Link href="/">
            <Button>Back to dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
