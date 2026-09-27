"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addComment } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export function CommentBox({ ticketId, canInternal }: { ticketId: string; canInternal: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [type, setType] = useState<"PUBLIC" | "INTERNAL">("PUBLIC");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-2 border-t pt-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!body.trim()) return;
        setBusy(true);
        setError(null);
        try {
          await addComment({ ticketId, body: body.trim(), type });
          setBody("");
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to post");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="flex gap-2 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={type === "PUBLIC"} onChange={() => setType("PUBLIC")} /> Reply (visible to requester)
        </label>
        {canInternal && (
          <label className="flex items-center gap-1">
            <input type="radio" checked={type === "INTERNAL"} onChange={() => setType("INTERNAL")} /> Internal note
          </label>
        )}
      </div>
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Write a reply…" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button size="sm" disabled={busy || !body.trim()}>
        {busy ? "Posting…" : "Post"}
      </Button>
    </form>
  );
}
