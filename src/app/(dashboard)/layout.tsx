import { DashboardShell } from "@/components/layout/dashboard-shell";
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
        status: { notIn: ["CLOSED", "RESOLVED"] },
        slaResolutionDueAt: { lt: new Date(Date.now() + 4 * 3600 * 1000) },
      },
    }),
  ]);

  return (
    <DashboardShell
      userName={session.user.name ?? session.user.email}
      counts={{ unassigned, slaRisk }}
    >
      {children}
    </DashboardShell>
  );
}
