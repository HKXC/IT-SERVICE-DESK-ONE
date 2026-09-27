"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type AttachmentItem = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string | null;
  createdAt: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Attachments({
  ticketId,
  initial,
  canUpload,
}: {
  ticketId: string;
  initial: AttachmentItem[];
  canUpload: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || uploading) return;
    const file = files[0];
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as { data?: AttachmentItem; error?: string };
      if (!res.ok) throw new Error(json.error ?? `Upload failed (${res.status})`);
      setSuccess(`Attached ${file.name}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Attachments ({initial.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {initial.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <FileText className="mx-auto mb-2 size-6 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">No attachments yet.</p>
            {canUpload && (
              <p className="text-xs text-muted-foreground">Attach a screenshot, log, or document below.</p>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {initial.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2.5 rounded-lg border p-2.5 text-sm"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  {a.storageUrl ? (
                    <a
                      href={a.storageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate font-medium text-[#0D9488] hover:underline"
                    >
                      {a.fileName}
                    </a>
                  ) : (
                    <p className="truncate font-medium">{a.fileName}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatSize(a.fileSize)} · {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                {a.storageUrl ? (
                  <Badge variant="success">Link</Badge>
                ) : (
                  <Badge variant="secondary">Stored</Badge>
                )}
              </li>
            ))}
          </ul>
        )}

        {canUpload && (
          <div className="border-t pt-3">
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              aria-label="Choose a file to attach (max 10 MB)"
              disabled={uploading}
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden /> Uploading…
                </>
              ) : (
                <>
                  <Upload aria-hidden /> Attach file
                </>
              )}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              Max 10 MB · png, jpg, webp, gif, pdf, txt, csv, zip, docx, xlsx
            </p>
          </div>
        )}

        <div aria-live="polite">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="flex-1">
                <p className="font-semibold">Upload failed</p>
                <p>{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                >
                  Retry
                </Button>
              </div>
            </div>
          )}
          {success && !error && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              <p>{success}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
