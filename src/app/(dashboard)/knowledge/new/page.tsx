import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth-helpers";
import { ArticleForm } from "@/components/knowledge/kb-forms";

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission("kb.manage"))) redirect("/knowledge");
  const categories = await db.knowledgeCategory.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">New Knowledge Article</h1>
      <ArticleForm categories={categories} />
    </div>
  );
}
