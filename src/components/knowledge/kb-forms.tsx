"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { createArticle, updateArticle, deleteArticle } from "@/actions/manage";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ArticleDefaults = {
  title: string;
  summary: string;
  body: string;
  categoryId: string;
  isPublished: boolean;
};

export function ArticleForm({
  articleId,
  categories,
  defaults,
}: {
  articleId?: string;
  categories: { id: string; name: string }[];
  defaults?: ArticleDefaults;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState("");

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>{articleId ? "Edit Article" : "New Article"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              const fd = new FormData(e.currentTarget);
              const payload = {
                title: fd.get("title") as string,
                summary: ((fd.get("summary") as string) || "").trim() || undefined,
                body: fd.get("body") as string,
                categoryId: ((fd.get("categoryId") as string) || "") || undefined,
                tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
                isPublished: fd.get("isPublished") === "on",
              };
              if (articleId) {
                await updateArticle(articleId, payload);
                router.push("/knowledge");
              } else {
                const r = await createArticle(payload);
                router.push(`/knowledge/${r.slug}`);
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : "Save failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="kb-title">Title *</Label>
            <Input id="kb-title" name="title" required minLength={5} defaultValue={defaults?.title} disabled={busy} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kb-summary">Summary</Label>
            <Input id="kb-summary" name="summary" defaultValue={defaults?.summary} disabled={busy} maxLength={500} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="kb-cat">Category</Label>
              <select
                id="kb-cat"
                name="categoryId"
                defaultValue={defaults?.categoryId ?? ""}
                disabled={busy}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kb-tags">Tags (comma separated)</Label>
              <Input id="kb-tags" value={tags} disabled={busy} onChange={(e) => setTags(e.target.value)} placeholder="vpn, wifi, password" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kb-body">Body * (Markdown supported)</Label>
            <Textarea id="kb-body" name="body" required minLength={10} rows={12} defaultValue={defaults?.body} disabled={busy} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPublished" defaultChecked={defaults?.isPublished} disabled={busy} className="size-4" />
            Published (visible to everyone)
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button disabled={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : articleId ? "Save changes" : "Create article"}
            </Button>
            <Button variant="outline" type="button" onClick={() => router.push("/knowledge")}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function DeleteArticleButton({ articleId, title }: { articleId: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      aria-label={`Delete article ${title}`}
      onClick={async () => {
        if (!window.confirm(`Delete "${title}"?`)) return;
        setBusy(true);
        try {
          await deleteArticle(articleId);
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
    </Button>
  );
}
