# AGENTS.md — IT Service Desk & Asset Management Platform

This file gives AI coding agents (Claude Code, Cursor, Codex, etc.) the context needed to work productively in this repository. Read this before making changes.

## 1. What this project is

A production-grade internal platform that unifies:

- IT Service Desk / Helpdesk (Incidents, Service Requests, Problems, Changes, Access Requests)
- IT Asset Management (ITAM) with full lifecycle tracking
- Inventory & Spare Parts management
- Software & License management
- SLA engine with business-hours-aware countdowns
- Knowledge Base, Reports & Analytics, Audit Logs
- RBAC with server-enforced permissions

Target scale: ~100 to several thousand users. Must remain maintainable and extensible (new ticket types, new asset categories, SSO providers, etc.) without schema rewrites.

## 2. Tech stack (do not substitute without discussion)

| Layer | Choice |
|---|---|
| Framework | Next.js 15+, App Router |
| Language | TypeScript, `strict: true` |
| UI | React, Tailwind CSS, shadcn/ui, Lucide icons |
| Charts | Recharts |
| Forms | React Hook Form + Zod (same schema shared client/server) |
| Backend | Next.js Server Actions + Route Handlers (REST, for integrations) |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | Auth.js, session-based, credentials + Argon2/bcrypt hashing. Architecture must stay pluggable for Entra ID / Google Workspace / LDAP / SSO — do not hardcode credentials-only assumptions into the session/user model. |
| Storage | Vercel Blob or S3-compatible |
| Deploy | Vercel |
| Monitoring | Vercel Analytics, Speed Insights |

## 3. Non-negotiable security rules

- **Never** treat hiding a menu item or button as access control. Every mutating action and every data read that isn't public must be authorized **server-side** against the permission list in §5, inside the Server Action / Route Handler itself — not just in middleware or in the UI.
- All input validated with Zod on the server, even if already validated on the client.
- All file uploads validated (type, size, content) before storage.
- Every ticket status change, asset change, permission change, and settings change writes an Audit Log entry (actor, action, before/after, timestamp).
- Rate limit auth endpoints and any public-facing routes (e.g. QR asset scan page).
- The public/anonymous QR asset scan page (`/assets/{asset-id}` unauthenticated view) may only ever expose: Asset Tag, Asset Name, Status, and a "Report Problem" button. Never expose serial number, IP/MAC, assigned user, cost, or any other field there — that data requires an authenticated session with `asset.read`.

## 4. Data model — core entities

Keep these as first-class Prisma models. Relations should be normalized (no duplicating denormalized text where a foreign key belongs), but you may add read-optimized views/materialized summaries for the dashboard if performance requires it — call this out explicitly in the PR/commit description if you do.

- `User`, `Department`, `Location`, `Role`, `Permission`, `RolePermission`
- `Ticket` (see §6 for fields/workflow), `TicketComment` (public vs internal), `WorkLog`, `TicketAttachment`, `TicketTimelineEvent`
- `SLAPolicy`, `SLARule` (priority → response/resolution targets), `BusinessHoursCalendar`, `Holiday`
- `Asset`, `AssetHistoryEvent`, `AssetAssignment`
- `InventoryItem`, `StockTransaction`
- `Software`, `License`, `LicenseAssignment`
- `Vendor`
- `KnowledgeArticle`, `KnowledgeCategory`
- `AuditLog`

## 5. RBAC — roles & permission keys

Default roles: `Employee`, `Technician`, `Team Lead`, `Asset Officer`, `IT Manager`, `Administrator`. Roles are just named permission bundles — the authorization check is always against the permission key, never against the role name directly, so custom roles can be created later without code changes.

Permission keys currently in scope (extend this list, don't fork a parallel system):

```
ticket.create   ticket.read   ticket.read_all   ticket.assign
ticket.update   ticket.delete ticket.resolve     ticket.close
asset.create    asset.read    asset.update       asset.assign
asset.retire    asset.dispose
inventory.read  inventory.manage
license.read    license.manage
user.manage     role.manage
report.read     audit.read    settings.manage
```

## 6. Ticket model

**ID format:** `{PREFIX}-{YEAR}-{6-digit-sequence}`, e.g. `INC-2026-000001`. Prefixes: `INC` Incident, `REQ` Service Request, `PRB` Problem, `CHG` Change Request. Generate the sequence atomically (DB sequence or transaction with row lock) — never derive it from a `COUNT(*)` query.

**Priority:** derived from an Impact × Urgency matrix (High/Medium/Low each), configurable from Settings, not hardcoded. Result is `P1 Critical` .. `P4 Low`.

**Workflow (must emit a `TicketTimelineEvent` on every transition):**

```
New → Acknowledged → Assigned → In Progress
In Progress → {Waiting for User | Waiting for Vendor | Waiting for Part | On Hold | Escalated}
… → Resolved → User Confirmation → Closed
Closed → (Reopen) → In Progress
```

Internal Notes are a distinct comment type from Conversation and must never be returned to a caller whose role lacks an internal-visibility permission — filter server-side, not client-side.

## 7. SLA engine

- SLA targets are per-priority (response time, resolution time), configurable, not hardcoded constants.
- SLA clocks run against a configurable Business Hours calendar + Holiday calendar.
- SLA **pauses** automatically while a ticket is in `Waiting for User`, `Waiting for Vendor`, or `Waiting for Part`, and resumes on exit from those states. Implement pause/resume as logged intervals (accumulated elapsed time), not as a single start/end timestamp, so reporting can show "SLA paused time" separately from breach time.
- SLA state is always one of `Healthy`, `At Risk`, `Breached` and should be computed, not stored as a static flag that can drift from the underlying timestamps.

## 8. Asset lifecycle

```
Requested → Purchased → Received → In Stock → Assigned → In Use
In Use → {Repair | Maintenance | Transfer} → (back to In Use, or onward)
→ Retired → Disposed
```

Every transition appends to `AssetHistoryEvent` (never mutate/delete history rows). "Frequent Repair" / "Consider Replacement" is a **derived, informational** flag (e.g. ≥3 repairs in a rolling 6-month window) — it must never trigger an automatic status change or auto-dispose action; it only surfaces in the UI as a suggestion.

QR codes encode `/assets/{asset-id}` and route to the restricted public view described in §3.

## 9. Stock transactions

`Stock In | Stock Out | Adjustment | Repair Usage | Return`. When a technician uses a part on a ticket, the write path is: create `WorkLog` part-usage entry → create `StockTransaction` → decrement `InventoryItem.quantity`, all inside a single DB transaction. Never decrement quantity outside a transaction boundary — this is the most likely place for a race condition under concurrent technicians.

## 10. UI / design system

A UI mockup already exists (`it-service-desk-mockup.html`, published as a Claude artifact) — treat its tokens as the source of truth until a design system is formally set up in code:

- Base palette: background `#F7F8FA` / dark `#0B1220`; panel `#FFFFFF` / dark `#111A2B`; brand (sidebar/header) `#1E3A5F`; accent (SLA/active state) `#0D9488`.
- Priority colors: P1 `#DC2626`, P2 `#EA580C`, P3 `#CA8A04`, P4 `#64748B` (each with a soft background tint for pill badges).
- Typeface: Inter, single family, weight for hierarchy — no decorative display font.
- Layout: left sidebar (grouped nav: Service Desk / Asset Management / Inventory / Software / Knowledge / Management / System) + sticky top bar; collapses to bottom/hamburger on mobile.
- Status and priority are always rendered as colored pills, consistently, across every list/table/detail view — don't introduce a second badge style.
- Respect `prefers-color-scheme` and support an explicit `data-theme="dark"|"light"` override, matching the tokens above.

## 11. Conventions for agents working in this repo

- Prefer editing/extending existing Prisma models and Server Actions over introducing a parallel data-access pattern.
- Any new permission-gated action needs: (a) a permission key added to §5, (b) a server-side check in the action itself, (c) an audit log write if it mutates data.
- Write Zod schemas once per entity and reuse them for both the form (client) and the Server Action (server) — don't hand-roll two versions.
- When adding a ticket type, priority level, or asset category, make it data-driven (DB-configured) rather than an enum baked into business logic, matching how Priority Matrix and SLA Policy are already configurable from Settings.
- Favor Server Actions for internal mutations; use Route Handlers only where an external system needs a REST endpoint (email-to-ticket, integrations, API clients).

## 12. Open / not-yet-decided

- Exact Prisma schema file has not been generated yet.
- SSO provider wiring (Entra ID / Google Workspace / LDAP) is architected for but not implemented.
- CI/test setup, seed data, and local dev `docker-compose` for Postgres are not yet defined — confirm with the team before assuming a specific test runner or seed strategy.
