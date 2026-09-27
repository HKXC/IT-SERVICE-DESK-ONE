import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const articles = await db.knowledgeArticle.findMany({
    where: { isPublished: true },
    include: { category: true },
    orderBy: { viewCount: "desc" },
    take: 50,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Knowledge Base</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {articles.map((a) => (
          <Link key={a.id} href={`/knowledge/${a.slug}`}>
            <Card className="hover:shadow-md">
              <CardHeader><CardTitle className="text-sm">{a.title}</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
                {a.category && <Badge variant="secondary">{a.category.name}</Badge>}
                <span>{a.viewCount} views</span>
              </CardContent>
            </Card>
          </Link>
        ))}
        {articles.length === 0 && (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No published articles yet. Seed data includes starter guides.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
