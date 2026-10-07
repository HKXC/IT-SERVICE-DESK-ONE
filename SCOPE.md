# SCOPE.md — IT Helpdesk Scope Lock & Reduction Plan

> **Progress:** S1–S3 DONE (ticket vocabulary reduced + row remap, priority matrix dropped with
> direct Set Priority, Reopen from Resolved, unified ticket timeline). Remaining: S4 onward.

> Read-only analysis pass. No code was modified. This file is a planning artifact for later passes.
> Current state: the repo is an Enterprise IT Service Desk + ITAM. The mission wants a 6-module IT Helpdesk.
> Boundary rule used here: the mission's "features NOT to do" list was truncated/empty, so nothing is removed
> merely because it wasn't named. Only enterprise machinery that contradicts the mission's "keep it simple"
> intent is marked for reduction. See **Open Questions** at the end.

---

## Part 1 — Inventory of what exists today

### 1.1 Stack (actual)

| Layer | Reality | Files |
|---|---|---|
| Framework | Next.js 15 App Router, React 19, TS strict | `package.json`, `next.config.ts`, `tsconfig.json` |
| Styling | Tailwind + shadcn-style primitives | `tailwind.config.ts`, `src/components/ui/*` |
| DB/ORM | PostgreSQL + Prisma (25+ models) | `prisma/schema.prisma` (735 lines), `prisma/seed.ts` |
| Auth | Auth.js v5 credentials + bcrypt + JWT | `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `middleware.ts` |
| AuthZ | Server-enforced RBAC via Permission/RolePermission matrix | `src/lib/permissions.ts`, `src/lib/auth-helpers.ts` |
| Charts | Recharts | `src/components/dashboard/charts.tsx` |
| Files | S3 / Vercel Blob abstraction | `src/lib/storage.ts`, `src/app/api/tickets/[id]/attachments/*` |
| Misc | QR codes, rate-limit, SSO stub, SLA engine, priority matrix | `src/lib/*` |

### 1.2 Feature inventory graded against the 6 in-scope modules

| # | Module / feature | Owner files | Mission grade |
|---|---|---|---|
| 1 | Login / Logout / session | `src/auth.ts`, `src/actions/auth.ts`, `src/components/auth/login-form.tsx` | **In scope** |
| 1b | Forgot / reset password + PasswordResetToken + rate-limit | `src/actions/auth.ts`, `src/app/(auth)/*`, `src/lib/rate-limit.ts` | In scope (adjacent to login) |
| 1c | User CRUD, activate/deactivate, change role | `src/actions/manage.ts`, `src/app/(dashboard)/users/*` | **In scope** |
| 1d | RBAC matrix: 27 permissions × 6 roles (Employee, Technician, Team Lead, Asset Officer, IT Manager, Administrator) | `src/lib/permissions.ts`, `prisma/schema.prisma` (Role/Permission/RolePermission), `prisma/seed.ts` | **Overbuilt** — mission allows only User / Technician / Administrator |
| 1e | Department **hierarchy** + Location entities | `Department`, `Location` models; `user-forms.tsx` | Overbuilt (mission needs a flat Department field at most) |
| 1f | SSO extension stub | `src/lib/sso.ts` | Out of scope (no-op today) |
| 2 | Ticket create / view / search / filter / paginate | `src/actions/tickets.ts`, `src/app/(dashboard)/tickets/page.tsx`, `new-ticket-form.tsx` | **In scope** |
| 2b | Ticket **type**: 6 values (INCIDENT, SERVICE_REQUEST, REPAIR, PROBLEM, CHANGE_REQUEST, ACCESS_REQUEST) | `TicketType` enum, `validations.ts`, new-ticket form, sidebar | **Overbuilt** — mission allows only Incident + Request |
| 2c | Ticket **status**: 12 values | `TicketStatus` enum, `workflow.ts`, `validations.ts` | **Overbuilt** — mission allows New/Assigned/In Progress/Resolved/Closed (+Waiting for User only if needed) |
| 2d | Ticket **priority**: P1–P4 derived from Impact × Urgency matrix (SystemSetting) | `TicketPriority`/`ImpactLevel`/`UrgencyLevel` enums, `src/lib/priority-matrix.ts`, `settings-forms.tsx` | **Overbuilt + wrong vocabulary** — mission wants Low/Med/High/Critical, set directly |
| 2e | Assign technician | `assignTicket()` in `src/actions/tickets.ts`, `ticket-ops.tsx` | **In scope** |
| 2f | Change status (guarded transitions + timeline) | `src/lib/workflow.ts`, `changeTicketStatus()` | **In scope** |
| 2g | Set / change priority (manual) | — none found — priority is only auto-derived at create | **Gap** |
| 2h | Resolve / Close | `changeTicketStatus()`, `TicketActions` | **In scope** |
| 2i | Reopen | `CLOSED → IN_PROGRESS` and `RESOLVED → IN_PROGRESS` exist in `TICKET_TRANSITIONS`, no explicit "Reopen" action/semantics | **Partial gap** |
| 2j | Select related Asset on ticket | `Ticket.assetId`, `new-ticket-form` `?assetId` | **In scope** |
| 2k | TicketRelation (RELATED/DUPLICATE/BLOCKS/CAUSED_BY) | `TicketRelation` model (unused in UI) | Out of scope (dead weight) |
| 2l | SLA engine: policies, business hours, holidays, pause intervals, breach flags, cron | `src/lib/sla-engine.ts`, `api/cron/sla-check`, `SLAPolicy`/`BusinessHours`/`Holiday`/`SLAPauseInterval`, ticket SLA card | **Enterprise machinery** |
| 2m | Work logs + spare-parts stock decrement | `WorkLog` model, `addWorkLog()`, `ticket-ops.tsx` | Out of scope (couples tickets to inventory) |
| 2n | Attachments + S3/Vercel Blob | `TicketAttachment`, `storage.ts`, `api/tickets/[id]/attachments/*` | Out of scope (not requested) |
| 2o | REST API for tickets (email-to-ticket / AI agent) | `src/app/api/tickets/route.ts` | Out of scope (duplicates the create action) |
| 2p | TicketSource enum (WEB/EMAIL/API/CHAT/AI_AGENT), satisfactionRating | `Ticket` model | Out of scope |
| 3 | Public vs Internal comments (server-side filtered) | `TicketComment`, `commentSchema`, `addComment()`/`getTicketComments()`, `comment-box.tsx` | **In scope** |
| 3b | Ticket timeline events | `TicketTimelineEvent`, `ticket/[id]/page.tsx` | **In scope** — event vocabulary is generic (`STATUS_CHANGED`, `CREATED`, `ASSIGNED`, `COMMENT_ADDED`); Resolved/Closed/Reopened are not distinct events |
| 4 | Asset CRUD + detail + list | `src/actions/assets.ts`, `src/app/(dashboard)/assets/*`, `new-asset-form.tsx` | **In scope** |
| 4b | Asset fields: 13-status ITAM lifecycle, specs (cpu/ram/storage/gpu/os/ip/mac), purchase price/warranty/vendor/department/location | `Asset` model, `assetCreateSchema`, asset pages | **Overbuilt** — mission needs Number/Name/Type/Brand/Model/Serial/Status/Responsible User |
| 4c | Asset history | `AssetHistoryEvent`, shown on asset page | **In scope** — but no explicit "Related Ticket" history event |
| 4d | Asset↔Ticket link | `Ticket.assetId`, asset page "Ticket History" | **In scope** |
| 4e | AssetAssignment history table | `AssetAssignment`, `assignAsset()` | In scope (supports Responsible User history) |
| 4f | QR tag + public `/scan/[id]` + public asset API | `src/app/scan/*`, `api/public/assets/*`, `react-qr-code` | Out of scope |
| 4g | Frequent-repair replacement flag | `assets/[id]/page.tsx` | Out of scope (ITAM-ish) |
| 5 | Dashboard tiles (Open, Unassigned, SLA at risk, Resolved today) + asset/inventory/license tiles | `src/app/(dashboard)/page.tsx` | **Partial** — mission wants Total/New/Assigned/In Progress/Resolved/Closed; missing per-status tiles; extra resource tiles |
| 5b | Charts: Tickets by Status, by Priority | `dashboard/charts.tsx` | **Partial** — missing by Type and by Technician |
| 6 | Reports: by Status, Priority, Type; Resolved/Closed count; SLA breached; "MTTR" (actually avg `slaPausedSeconds`) | `src/app/(dashboard)/reports/page.tsx` | **Partial + incorrect** — missing Total, by Technician, real avg resolution time; "MTTR" is mislabeled |
| E1 | Audit subsystem (`AuditLog`, `audit()` in every action, `/audit` page) | `src/lib/audit.ts`, `AuditLog` model, all actions, `audit/page.tsx` | **Enterprise machinery** |
| E2 | Notifications (model + API + bell/counts) | `Notification` model, `api/notifications`, `topbar.tsx`, `dashboard-shell.tsx` | **Enterprise machinery** (not requested) |
| E3 | Inventory + stock transactions (+ worklog consumption) | `InventoryItem`/`StockTransaction`, `src/actions/assets.ts`, `inventory/*` pages, `stock-forms.tsx` | **Out of scope** |
| E4 | Software & Licenses | `Software`/`License`/`LicenseAssignment`, `actions/manage.ts`, `software/*` | **Out of scope** |
| E5 | Vendors | `Vendor` model, `vendor-forms.tsx`, `vendors/page.tsx` | **Out of scope** |
| E6 | Knowledge Base | `KnowledgeCategory`/`KnowledgeArticle`, `actions/manage.ts`, `knowledge/*` | **Out of scope** |
| E7 | Settings (SLA policy, priority matrix, holidays) | `settings-forms.tsx`, `settings/page.tsx`, `actions/manage.ts` | Out of scope (exists to serve SLA/matrix) |
| E8 | Health endpoint, Vercel Analytics/SpeedInsights | `api/health`, `@vercel/analytics` | Neutral infra — keep |

### 1.3 Duplication found

| Duplicate | Where | Impact |
|---|---|---|
| Ticket creation logic | `createTicket()` (Server Action) vs `POST /api/tickets` | Priority/numbering/deadlines computed twice; drift risk |
| Status/priority/type stats | `dashboard/page.tsx` **and** `reports/page.tsx` both `groupBy` | Two sources of truth for the same numbers |
| Ticket activity views | Comments + Work Logs + Timeline + SLA card all on one page | Overlapping "history" surface; mission only asks for comments + timeline |

---

## Part 2 — Reduction plan (ordered, smallest cohesive steps first)

Each step is a self-contained pass. Foundational vocabulary changes come first because they touch migration, workflow, validation, UI and seed together.

| Step | Goal | Concrete change | Must keep |
|---|---|---|---|
| **S0** | Lock the scope contract | Confirm the 3 roles, 2 types, 4 priorities, 6 statuses, reopen rule, and the blacklist answer in this file | — |
| **S1** | Reduce ticket vocabularies | Prisma enum migration: `TicketType`→{INCIDENT, SERVICE_REQUEST}; `TicketStatus`→{NEW, ASSIGNED, IN_PROGRESS, WAITING_USER, RESOLVED, CLOSED}; `TicketPriority`→{LOW, MEDIUM, HIGH, CRITICAL}. Map existing rows (`ACKNOWLEDGED→NEW`, `WAITING_VENDOR/WAITING_PART→WAITING_USER`, `ON_HOLD/ESCALATED→ASSIGNED`, `PENDING_CONFIRMATION→RESOLVED`, P1→CRITICAL, P2→HIGH, P3→MEDIUM, P4→LOW). Update `workflow.ts`, `validations.ts`, `STATUS_META`, badges, selects, seed | Ticket core, numbering |
| **S2** | Drop Impact×Urgency + make priority settable | Remove `impact`/`urgency` usage and `priority-matrix.ts` + `SystemSetting.priority_matrix`; add `changePriority()` action + UI control; priority chosen directly at create | SLA columns untouched for now |
| **S3** | Ticket capability gaps | Add explicit **Reopen** (RESOLVED→IN_PROGRESS, or CLOSED→IN_PROGRESS) with a `REOPENED` timeline event; emit distinct `RESOLVED`/`CLOSED` timeline events; confirm Cancel/Resolve/Close actions | Timeline + comments |
| **S4** | Rebuild Dashboard to the required tiles | Show Total / New / Assigned / In Progress / Resolved / Closed; add charts/stat blocks by Priority, Type, Technician; remove asset/inventory/license/SLA tiles | Role-aware "my vs all" filter |
| **S5** | Rebuild Report from real data | Add Total tickets, by Technician, Resolved/Closed count, and **avg resolution time** = AVG(`resolvedAt` − `createdAt`) over resolved tickets; delete the mislabeled SLA/"MTTR" tile | by Status/Priority/Type |
| **S6** | Downgrade Asset Management | Trim form + list to Number/Name/Type/Brand/Model/Serial/Status/Responsible User; reduce `AssetStatus` to a small set (e.g. IN_STOCK, IN_USE/ASSIGNED, REPAIR, RETIRED); drop spec/purchase/warranty/vendor/department/location fields from UI (and schema in S9); add a `TICKET_LINKED`/related-ticket asset history event | Asset history, assignment, ticket link |
| **S7** | Remove out-of-scope nav + routes (chunk A) | Delete pages/actions/components for Knowledge, Vendors, Software & Licenses | Sidebar shell, users, tickets, assets |
| **S8** | Remove out-of-scope nav + routes (chunk B) | Delete Inventory (+ stock txn pages) and the work-log parts/stock coupling | Work logs optional — decide if kept as simple notes |
| **S9** | Remove enterprise subsystems | Delete SLA engine + cron + settings page + Audit page + Notifications API/bell + QR `/scan` + `api/public` + attachments + REST `api/tickets`; remove their models/columns in one migration | Ticket comments, timeline, attachments optional (decide) |
| **S10** | Collapse RBAC to 3 roles | Replace Permission/RolePermission matrix with the fixed 3 roles + server-side checks in `auth-helpers.ts`; drop 3 extra roles and unused permission keys; update seed | Server-enforced AuthZ |
| **S11** | Schema cleanup migration | Drop now-unused tables: `SLAPolicy`, `BusinessHours`, `Holiday`, `SLAPauseInterval`, `InventoryItem`, `StockTransaction`, `Software`, `License`, `LicenseAssignment`, `Vendor`, `KnowledgeCategory`, `KnowledgeArticle`, `Notification`, `AuditLog`, `TicketRelation`, `TicketAttachment`, `PasswordResetToken` (if reset dropped); drop `Ticket` SLA/impact/urgency/source/satisfaction/assignedTeam columns | user/role/dept/ticket/comment/timeline/asset/assetHistory/assetAssignment |
| **S12** | Docs + verification | Rewrite `README.md`/`STATUS.md` to the 6-module scope; run `tsc --noEmit` and `next build`; exercise login → create → assign → resolve → close → reopen, comment public/internal, asset link, dashboard, report | — |

### 2.1 Gaps the mission requires that do NOT exist yet

| Gap | Where to add | Data-model note |
|---|---|---|
| Manual **Set/Change Priority** | new `changePriority()` + control in `ticket-ops.tsx` | Column exists (`priority`) |
| **Reopen from Resolved** as an explicit action | `changeTicketStatus()` + `TicketActions` | Transition exists; needs distinct event + UI label |
| Distinct timeline events for **Resolved / Closed / Reopened** | `changeTicketStatus()` | `TicketTimelineEvent.event` is free-text — no schema change |
| **Ticket by Type / by Technician** stats | dashboard + reports | `groupBy(["type"])`, `groupBy(["assigneeId"])` supported |
| **Average resolution time** | reports | `resolvedAt` − `createdAt` supported; do **not** use `slaPausedSeconds` |
| **Asset history "Related Ticket"** event | `createTicket()` when `assetId` set | `AssetHistoryEvent` exists, `event` free-text |
| Required dashboard tiles Total/New/Assigned/In Progress/Resolved/Closed | dashboard | `groupBy(["status"])` supported |
| Lightweight `AssetStatus` set | S6/S9 migration | enum reduction needs value remap |

### 2.2 Where the data model cannot support the required outcome

| Required outcome | Blocker | Required model change |
|---|---|---|
| Priority named Low/Medium/High/Critical | Enum is `P1..P4` | Rename enum values + migrate rows + update all switches (`priority-matrix`, SLA targets, badges) |
| Status set of 6 | Enum has 12 values | Reduce enum + map out-of-set rows before constraint applies |
| Type set of 2 | Enum has 6 values | Reduce enum + map `REPAIR/PROBLEM/CHANGE_REQUEST/ACCESS_REQUEST` |
| Reopen from Resolved | Not blocked | Already expressible; only UI/event naming missing |
| Avg resolution time | Not blocked | Derivable from `createdAt`/`resolvedAt` |
| Only 3 roles | Matrix is keyed by role name + permissions | Replace with fixed roles; keep `Role` table with 3 rows or a `User.role` enum |
| Assets without ITAM depth | Columns are nullable/tolerant | Dropping columns is safe but is a schema migration |

---

## Part 3 — Open Questions (need the user/decider)

1. **The "features NOT to do" list arrived empty/truncated.** Do not invent a blacklist. Please supply it. Until then this plan keeps anything the code already has unless it is enterprise machinery that contradicts the mission's 6-module intent (SLA, inventory, software/licensing, vendors, KB, notifications, audit, QR/public, attachments, REST API, RBAC matrix).
2. **Attachments** — not named in the 6 modules. Keep (small) or remove?
3. **Work logs** — mission asks for comments + timeline only. Keep work logs as simple notes, or remove with inventory?
4. **Password reset / rate-limit / SSO stub** — part of Authentication, but beyond a minimal login. Keep reset, drop SSO stub?
5. **Delete routes vs hide them** — physically delete out-of-scope modules, or leave code and only remove from navigation? (Recommendation: delete, to actually reduce complexity.)

---

## Part 4 — Target state (after reduction)

| Module | Target |
|---|---|
| Authentication & User | Login/Logout, user management, exactly 3 roles (User, Technician, Administrator), fields Name/Email/Department/Role |
| Ticket Management | Incident/Request; priorities Low/Med/High/Critical set directly; statuses New→Assigned→In Progress→Resolved→Closed (+Waiting for User); assign, search, filter, asset link, resolve/close/reopen |
| Comment & Timeline | Public + internal comments; single timeline of Created/Assigned/Status Changed/Comment/Resolved/Closed/Reopened |
| Asset Management | Asset Number/Name/Type/Brand/Model/Serial/Status/Responsible User + history + ticket link |
| Dashboard | Total/New/Assigned/In Progress/Resolved/Closed + by Priority/Type/Technician/Status |
| Report | Totals by status/priority/type/technician, resolved/closed count, avg resolution time from real timestamps |
