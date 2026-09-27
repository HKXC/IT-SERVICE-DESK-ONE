import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { hasPermission } from "@/lib/auth-helpers";
import { ArticleForm } from "@/components/knowledge/kb-forms";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission("kb.manage"))) redirect("/knowledge");
  const { slug } = await params;
  const [article, categories] = await Promise.all([
    db.knowledgeArticle.findUnique({ where: { slug } }),
    db.knowledgeCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!article) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Edit Article</h1>
      <ArticleForm
        articleId={article.id}
        categories={categories}
        defaults={{
          title: article.title,
          summary: article.summary ?? "",
          body: article.body,
          categoryId: article.categoryId ?? "",
          isPublished: article.isPublished,
        }}
      />
    </div>
  );
}
