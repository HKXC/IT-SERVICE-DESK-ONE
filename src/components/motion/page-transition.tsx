"use client";

import { usePathname } from "next/navigation";

/**
 * Opacity-only page transition. Remounting on pathname change restarts a
 * 200ms fade (0 → 1); no slide, zoom or rotation. Disabled on task/CRUD
 * pages, which the ambient-motion scope marks as "none".
 */
export function PageTransition({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (!enabled) return <>{children}</>;
  return (
    <div key={pathname} className="page-fade">
      {children}
    </div>
  );
}
