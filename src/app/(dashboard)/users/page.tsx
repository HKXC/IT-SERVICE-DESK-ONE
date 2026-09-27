import { db } from "@/lib/db";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission("user.manage"))) redirect("/");
  const users = await db.user.findMany({ include: { role: true, department: true }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Users ({users.length})</h1>
      <Card><CardHeader><CardTitle className="text-sm">All users — server-authorized (user.manage)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Email</th><th className="px-4 py-2.5">Role</th><th className="px-4 py-2.5">Dept</th><th className="px-4 py-2.5">Active</th></tr>
            </thead>
            <tbody>
              {users.map((u) => <tr key={u.id} className="border-b last:border-0"><td className="px-4 py-2.5">{u.name}</td><td className="px-4 py-2.5">{u.email}</td><td className="px-4 py-2.5"><Badge variant="secondary">{u.role?.name ?? "—"}</Badge></td><td className="px-4 py-2.5">{u.department?.name ?? "—"}</td><td className="px-4 py-2.5">{u.isActive ? "Yes" : "No"}</td></tr>)}
            </tbody>
          </table>
        </CardContent></Card>
    </div>
  );
}
