// Three fixed roles. Authorization MUST use these capabilities server-side —
// never check role names inline in actions/pages.
export const ROLES = ["User", "Technician", "Administrator"] as const;
export type RoleName = (typeof ROLES)[number];

export const CAPABILITIES = [
  "ticket.create",
  "ticket.read_all",
  "ticket.assign",
  "ticket.update",
  "ticket.resolve",
  "ticket.close",
  "asset.read",
  "asset.manage",
  "user.manage",
  "report.read",
  "settings.manage",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

// Default role → capabilities (mirrored in prisma/seed.ts)
export const ROLE_CAPABILITIES: Record<RoleName, Capability[]> = {
  User: ["ticket.create"],
  Technician: [
    "ticket.create",
    "ticket.read_all",
    "ticket.assign",
    "ticket.update",
    "ticket.resolve",
    "ticket.close",
    "asset.read",
    "report.read",
  ],
  Administrator: [...CAPABILITIES],
};

export function roleHasCapability(role: string | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return (ROLE_CAPABILITIES[role as RoleName] ?? []).includes(capability);
}
