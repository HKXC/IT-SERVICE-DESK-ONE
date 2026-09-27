import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [unassigned, slaRisk] = await Promise.all([
    db.ticket.count({ where: { assigneeId: null, status: { notIn: ["CLOSED", "RESOLVED"] } } }),
    db.ticket.count({
      where: {
        status: { notIn: ["CLOSED", "RESOLVED", "PENDING_CONFIRMATION"] },
        slaResolutionDueAt: { lt: new Date(Date.now() + 4 * 3600 * 1000) },
      },
    }),
  ]);

  return (
    <div className="flex min-h-screen bg-[#F7F8FA] dark:bg-[#0B1220]">
      <Sidebar counts={{ unassigned, slaRisk }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={session.user.name ?? session.user.email} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
