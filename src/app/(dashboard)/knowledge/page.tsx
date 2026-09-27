import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth-helpers";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteArticleButton } from "@/components/knowledge/kb-forms";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const canManage = await hasPermission("kb.manage");
  const articles = await db.knowledgeArticle.findMany({
    where: canManage ? {} : { isPublished: true },
    include: { category: true },
    orderBy: { viewCount: "desc" },
    take: 50,
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Knowledge Base</h1>
        {canManage && (
          <Link href="/knowledge/new">
            <Button size="sm">+ New Article</Button>
          </Link>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {articles.map((a) => (
          <Card key={a.id} className="hover:shadow-md">
            <Link href={`/knowledge/${a.slug}`}>
              <CardHeader><CardTitle className="text-sm">{a.title}</CardTitle></CardHeader>
            </Link>
            <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
              {a.category && <Badge variant="secondary">{a.category.name}</Badge>}
              <span>{a.viewCount} views</span>
              {!a.isPublished && <Badge variant="warning">Draft</Badge>}
              {canManage && (
                <span className="ml-auto flex gap-1.5">
                  <Link href={`/knowledge/${a.slug}/edit`}>
                    <Button size="sm" variant="outline">Edit</Button>
                  </Link>
                  <DeleteArticleButton articleId={a.id} title={a.title} />
                </span>
              )}
            </CardContent>
          </Card>
        ))}
        {articles.length === 0 && (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No articles yet. {canManage ? "Create the first one above." : "Check back later."}</CardContent></Card>
        )}
      </div>
    </div>
  );
}
