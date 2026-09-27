import { db } from "@/lib/db";
import type { ImpactLevel, TicketPriority, UrgencyLevel } from "@prisma/client";

export type Impact = ImpactLevel | "HIGH" | "MEDIUM" | "LOW";
export type Urgency = UrgencyLevel | "HIGH" | "MEDIUM" | "LOW";

// Default Impact × Urgency → Priority matrix. Overridable via
// SystemSetting key `priority_matrix` from Settings UI (data-driven, §11).
const DEFAULT_MATRIX: Record<string, TicketPriority> = {
  "HIGH:HIGH": "P1",
  "HIGH:MEDIUM": "P2",
  "HIGH:LOW": "P2",
  "MEDIUM:HIGH": "P2",
  "MEDIUM:MEDIUM": "P3",
  "MEDIUM:LOW": "P3",
  "LOW:HIGH": "P3",
  "LOW:MEDIUM": "P4",
  "LOW:LOW": "P4",
};

export async function resolvePriority(
  impact: Impact,
  urgency: Urgency
): Promise<TicketPriority> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: "priority_matrix" },
    });
    if (setting?.value && typeof setting.value === "object") {
      const m = setting.value as Record<string, TicketPriority>;
      const hit = m[`${impact}:${urgency}`];
      if (hit === "P1" || hit === "P2" || hit === "P3" || hit === "P4")
        return hit;
    }
  } catch {
    // fall through to default matrix
  }
  return DEFAULT_MATRIX[`${impact}:${urgency}`] ?? "P3";
}

export const PRIORITY_META: Record<
  TicketPriority,
  { label: string; color: string; soft: string }
> = {
  P1: { label: "P1 · Critical", color: "#DC2626", soft: "#FEF2F2" },
  P2: { label: "P2 · High", color: "#EA580C", soft: "#FFF7ED" },
  P3: { label: "P3 · Medium", color: "#CA8A04", soft: "#FEFCE8" },
  P4: { label: "P4 · Low", color: "#64748B", soft: "#F1F5F9" },
};
