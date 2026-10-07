/**
 * Ambient-motion intensity per route.
 *
 * The animation layer is purely visual: this map decides how much (if any)
 * ambient light a page gets, without changing any page's layout or content.
 *
 *   high   – Dashboard: cursor glow + ambient depth + KPI card hover + page fade
 *   medium – Ticket / Asset detail: cursor glow + ambient depth + card hover + page fade
 *   low    – Ticket / Asset lists: row hover + a faint cursor glow only
 *   none   – Task/CRUD pages (create, edit, users, settings, …): no ambient layer
 */
export type MotionScope = "high" | "medium" | "low" | "none";

export function getMotionScope(pathname: string): MotionScope {
  if (pathname === "/") return "high";

  const ticketDetail = /^\/tickets\/([^/]+)$/.exec(pathname);
  if (ticketDetail && ticketDetail[1] !== "new") return "medium";

  const assetDetail = /^\/assets\/([^/]+)$/.exec(pathname);
  if (assetDetail && assetDetail[1] !== "new" && assetDetail[1] !== "assignments") {
    return "medium";
  }

  if (pathname === "/tickets") return "low";
  if (pathname === "/assets" || pathname === "/assets/assignments") return "low";

  return "none";
}
