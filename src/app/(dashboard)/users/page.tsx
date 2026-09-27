import { db } from "@/lib/db";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateUserForm, UserRowActions } from "@/components/users/user-forms";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission("user.manage"))) redirect("/");
  const [users, roles, departments, locations] = await Promise.all([
    db.user.findMany({ include: { role: true, department: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.role.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.location.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Users ({users.length})</h1>
        <CreateUserForm roles={roles} departments={departments} locations={locations} />
      </div>
      <Card><CardHeader><CardTitle className="text-sm">All users — server-authorized (user.manage)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Email</th><th className="px-4 py-2.5">Dept</th><th className="px-4 py-2.5">Active</th><th className="px-4 py-2.5">Manage</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5">{u.name}</td>
                  <td className="px-4 py-2.5">{u.email}</td>
                  <td className="px-4 py-2.5">{u.department?.name ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={u.isActive ? "success" : "secondary"}>{u.isActive ? "Yes" : "No"}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <UserRowActions
                      userId={u.id}
                      isActive={u.isActive}
                      roleId={u.roleId}
                      roles={roles}
                      isSelf={u.id === session.user.id}
                    />
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No users yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent></Card>
    </div>
  );
}
