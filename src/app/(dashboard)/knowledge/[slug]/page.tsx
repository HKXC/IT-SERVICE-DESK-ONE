import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function KbArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { slug } = await params;
  const article = await db.knowledgeArticle.findUnique({ where: { slug }, include: { category: true, author: { select: { name: true } } } });
  if (!article || !article.isPublished) notFound();
  await db.knowledgeArticle.update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } });
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-xs text-muted-foreground">{article.category?.name ?? "General"} · by {article.author?.name ?? "IT Team"}</p>
      <h1 className="text-2xl font-bold">{article.title}</h1>
      {article.summary && <p className="text-muted-foreground">{article.summary}</p>}
      <Card><CardHeader><CardTitle className="text-sm">Guide</CardTitle></CardHeader>
        <CardContent><p className="whitespace-pre-wrap text-sm leading-relaxed">{article.body}</p></CardContent></Card>
    </div>
  );
}
