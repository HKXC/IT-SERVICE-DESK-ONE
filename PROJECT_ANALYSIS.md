# IT Service Desk — Project Audit Report (Verified Against Source)

> Read-only audit. No source files were modified, no packages installed, no migrations run, no environment variables changed. Every finding below was produced by static inspection of the actual repository source. Runtime checks that need `node_modules` / a live database are marked **not verified**.

---

## 1. What this project actually does

Plain-language summary: an internal "IT Service Desk + Asset Management" web app. People log in with email/password, raise tickets, a technician can take the ticket, work on it, attach files, and use spare parts (which decrements inventory in the same transaction), assets can be registered and assigned, plus there is a knowledge base, inventory, software/license tracking, vendors, reports, and an audit log. A public QR view lets anyone look up an asset tag/name/status and file a "Report Problem", which links into the ticket flow.

---

## 2. Architecture (from code)

| Layer | What the code actually uses |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript strict |
| DB | PostgreSQL + Prisma 6, single squashed migration `20260927071632_init` |
| Auth | Auth.js v5 (next-auth `^5.0.0-beta.32`), JWT sessions, PrismaAdapter, credentials+bcrypt |
| AuthZ (basis) | Permission-key RBAC (`src/lib/permissions.ts`), checked with `requirePermission()`/`hasPermission()` |
| Enforced at | Server Actions + Route Handlers for mutations; Middleware (`middleware.ts`) enforces **login only**, never authorization |
| Forms | React Hook Form + Zod, same schemas shared client/server (`src/lib/validations.ts`) |
| Storage | Vercel Blob → S3-compatible → local `/tmp` (dev fallback) |
| Charts | Recharts (installed; used only on dashboard, not wired into reports) |
| Testing | **None.** No `test` script, no test files, no runner. |

---

## 3. Database schema (verified)

34 models, 12 enums. Sections: auth.js accounts/sessions (User/Account/Session/VerificationToken/PasswordResetToken), org+RBAC (Department/Location/Role/Permission/RolePermission), tickets (Ticket/TicketSequence/TicketRelation/TicketComment/WorkLog/TicketAttachment/TicketTimelineEvent), SLA (SLAPolicy/BusinessHours/Holiday/SLAPauseInterval), assets (Asset/AssetHistoryEvent/AssetAssignment), inventory (InventoryItem/StockTransaction), software/licenses (Software/License/LicenseAssignment), vendors, KB (KnowledgeCategory/KnowledgeArticle), notifications, audit (Notification/AuditLog/SystemSetting).

Key enums (verified in schema): `TicketType` (6 members), `TicketStatus` (12 members), `TicketPriority` P1–P4, `ImpactLevel`/`UrgencyLevel` (HIGH/MEDIUM/LOW), `TicketSource` (5), `AssetStatus` (13), `AssetType` (6), `StockTxnType` (5), `CommentType` PUBLIC/INTERNAL, `NotificationChannel` IN_APP/EMAIL.

Accounting relations: User→Role/Department/Location; Ticket→Requester/Assignee/Asset; Asset→history/assignments; License→assignments; Role↔Permission via RolePermission; AuditLog.actorId is SetNull on delete.

---

## 4. Authentication / authorization (verified)

- **Login** — credentials, bcrypt, JWT; `rememberMe` extends session to 30 days; `lastLoginAt` updated on successful login.
- **Session** — `jwt` strategy with `roleId`/`roleName` embedded in token; `canViewInternalNotes` = technician+ (ticket.update/assign/read_all).
- **Middleware** (`src/middleware.ts`) — redirects unauthenticated users; it never checks permissions.
- **Permission keys in code** (verified): ticket.{create,read,read_all,assign,update,delete,resolve,close}, asset.{create,read,update,assign,retire,dispose}, inventory.{read,manage}, license.{read,manage}, user.manage, role.manage, report.read, audit.read, settings.manage, kb.{read,manage}, vendor.manage, sla.manage.
- **Default role bundles** (verified): Employee; Technician; Team Lead; Asset Officer; IT Manager; Administrator. Notable: Technician lacks `ticket.assign` and `ticket.close`.
- **Where enforcement lives** (verified): `requirePermission()` in actions/Route Handlers; `hasPermission()` in pages. **Not** used as a *read* gate on several list/detail pages (see §6).

---

## 5. Ticket workflow (verified)

- **Numbering** — `PREFIX-YYYY-000001` via DB-transaction upsert; never `COUNT(*)`. Correct as designed.
- **Priority** — Impact×Urgency matrix, data-driven via `SystemSetting.priority_matrix` with hardcoded fallback; `resolvePriority()` consults DB first.
- **Transitions** — `isValidTransition()` guards every `changeTicketStatus` call. Graph: NEW→ACKNOWLEDGED/ASSIGNED; ACKNOWLEDGED→ASSIGNED/IN_PROGRESS; ASSIGNED→IN_PROGRESS/ESCALATED/ON_HOLD; IN_PROGRESS→WAITING_* / ON_HOLD / ESCALATED / RESOLVED; WAITING_*→IN_PROGRESS/ON_HOLD/RESOLVED; ON_HOLD→IN_PROGRESS/ESCALATED; ESCALATED→IN_PROGRESS/ASSIGNED/RESOLVED; RESOLVED→PENDING_CONFIRMATION/IN_PROGRESS/CLOSED; PENDING_CONFIRMATION→CLOSED/IN_PROGRESS; CLOSED→IN_PROGRESS (reopen).
- **Timeline** — `changeTicketStatus`, `assignTicket`, `addComment`, `addWorkLog`, attachments all write `TicketTimelineEvent`.
- **SLA pause** — entering/exiting WAITING_* sets `slaPauseStartedAt` + accumulates `slaPausedSeconds`; pause interval rows appended; timestamps stored.
- **Gaps found in workflow** — `assignTicket` does the ticket `UPDATE` and the timeline `CREATE` as two separate calls (not one transaction). There is no requester-facing "confirm resolution" branch that differs from staff actions. `firstResponseAt` is stamped only at NEW→ACKNOWLEDGED time, not on first public reply.

---

## 6. Server-side authorization — verified as-is

Status of *read* gates (what the page actually checks on load):

| Page | Check actually present | Result |
|---|---|---|
| `/tickets` (list) | `ticket.read_all` → `requesterId` filter for Employees | OK (owned by authz) |
| `/tickets/[id]` | **session only** (no permission) | **ITRO — any authenticated user can read any ticket by ID** |
| `/tickets/new` | redirect to `/assets` if no `asset.create` | OK |
| `/assets` (list) | session only | **ITRO — all assets visible to any authenticated user** |
| `/assets/new` | `asset.create` | OK |
| `/assets/[id]` | session only; renders serial/IP/MAC/owner | **ITRO — full asset detail exposed, no `asset.read` check** |
| `/assets/assignments` | session only | **ITRO** |
| `/inventory` (stock + forms) | `inventory.manage` gates *forms* only; list has no read gate | **publish-authorized but no read gate** |
| `/inventory/transactions` | session only | **ITRO** |
| `/software` | session only | **ITRO — license/software rows visible to all** |
| `/knowledge` | session only; `kb.manage` gates drafts | **ITRO on list** |
| `/users` | `user.manage` | OK |
| `/reports` | `report.read` | OK |
| `/audit` | `audit.read` | OK |
| `/settings` | `settings.manage` | OK |
| `/vendors` | `vendor.manage` | OK |
| `/api/tickets` GET/POST | `ticket.read`/`ticket.create` | OK |
| `/api/tickets/.../attachments` POST/GET | owner-or-staff check | OK |
| `/api/public/assets/[id]` JSON | none (mirrors restricted view) | no rate limit (upstream `/scan` page does) |

Action-level (`requirePermission` called in mutations):
- `createTicket`, `changeTicketStatus` (ticket.update + resolve/close props), `assignTicket` (ticket.assign), `addComment` (ticket.update for internal / ticket.read for public), `addWorkLog` (ticket.update), `createAsset`, `changeAssetStatus` (asset.update, plus retire/dispose sub-keys), `assignAsset` (asset.assign), `adjustStock` (inventory.manage), `createInventoryItem`, `createSoftware`, `createLicense`, `assignLicense`, `revokeLicense`, `createArticle`, `updateArticle`, `deleteArticle`, `saveSLAPolicy` (sla.manage), `savePriorityMatrix` (settings.manage), `addHoliday`, `deleteHoliday`, `createUser`, `setUserActive`, `changeUserRole`, `createVendor`, `deleteVendor`, `loginAction`, `requestPasswordReset`, `resetPassword`.
- **Unused keys**: `ticket.delete` — no action or UI. `role.manage` — no action or UI.
- **`slaStateFor`/`effectiveElapsedSec`** — defined in `src/lib/sla-engine.ts` but **never called anywhere**; the UI recomputes remaining time manually from due timestamps. So SLA "state" is not actually consumed by any component.
- **Password reset** — token generated and stored; the email-send step is a TODO (`actions/auth.ts:46`). Tokens stored in plaintext. `resetPassword` not rate-limited (throttling only on request).
- **`/api/cron/sla-check`** — when `CRON_SECRET` is unset, the endpoint is unauthenticated.

---

## 7. Asset lifecycle (verified)

- **Transitions** — `changeAssetStatus` allows arbitrary `AssetStatus` values with no guard (enum is 13 states). History rows are appended only; nothing deletes them. `frequentRepair` flag (≥3 repairs in 180 days) is informational only, never auto-transitions.
- **Assignment** — `assignAsset` closes the previous open assignment and opens a new one atomically; sets `assignedUserId`, status.
- **QR** — `react-qr-code` renders `/scan/{asset.id}`; the public page selects only `assetTag/name/status`; report button links to `/login?callbackUrl=/tickets/new&assetId=`. Good match to §3 rules.
- **Stock decrement** — `addWorkLog` (parts) does worklog + stock txn + `decrement` inside one transaction. `adjustStock` elsewhere uses read-modify-write (`item.quantity + delta`) — race-prone under concurrency; noted for confirmation.

---

## 8. SLA engine (verified)

- Targets per priority from `SLAPolicy` (configurable) with defaults fallback.
- `addBusinessMinutes` steps minute-by-minute (efficiency note) and uses the **server's local timezone**; it does not respect the `BusinessHours.timezone` column (stored `Asia/Bangkok`). Verified in source.
- Holidays fetched server-side; pause accounting via `slaPauseStartedAt` + `slaPausedSeconds`.
- `slaStateFor` computes HEALTHY/AT_RISK/BREACHED/MET/PAUSED but **unused**.
- `/api/cron/sla-check` sets breach flags every 5 min (verified).

---

## 9. Reports (verified)

- `/reports` (needs `report.read`) shows: resolved/closed count, SLA-breach flag count, average paused seconds, plus by-status/by-priority/by-type counts. No charts wired there despite Recharts dependency. No permission-aware data-set beyond the basic counts.

---

## 10. Feature inventory (verified)

**Core:**
- Login (credentials, rate-limited), session, RBAC
- Ticket create (6 types), atomic numbering, priority matrix
- Workflow + timeline (+ SLA pause bookkeeping)
- Comment public/internal + server-side filtering; work logs; attachments (upload/download)
- Asset CRUD + lifecycle + history + assignment + QR
- Inventory + stock transactions + worklog part usage
- Software/license + seat assign/revoke
- Vendor CRUD
- Knowledge Base CRUD + published/draft filtering
- Users management (create/activate/role)
- Reports + audit log + settings (SLA/matrix/holidays)
- Password reset token flow (no email)
- REST `/api/tickets` GET/POST
- Cron SLA check
- Notifications API (in-app; no event-generation hooks found)

**Supporting (but present and verifiable, not part of the ticket core flow):**
- Inventory/stock, Knowledge Base, Reports, QR public view, notifications (load only), REST API for integrations, SSO scaffolding, vendor management, licenses.

**Advanced/deferred in practice (structural, not per-se harmful):**
- TicketRelation (BLOCKS/CAUSED_BY/DUPLICATE) — model present, no usage found in code
- Business-hours/holiday SLA calendar — stored data, coarse timezone bug
- SLAPauseInterval / accumulated-pause reporting — present but `slaStateFor` unused
- Cross-ticket relations — present, no UI/action
- Email/notification events — API only, no generation points

---

## 11. Reachable gaps (verified from code)

| # | Area | Detail | Severity |
|---|---|---|---|
| 1 | Read-path IDOR — tickets | `/tickets/[id]` checks session only | Critical |
| 2 | Read-path IDOR — assets | `/assets/[id]` + `/assets` list + `/assets/assignments` check nothing | Critical |
| 3 | Read-path IDOR — inventory | `/inventory`, `/inventory/transactions` no `inventory.read` | High |
| 4 | Read-path IDOR — software | `/software` no `license.read` | Medium |
| 5 | Cron auth | `CRON_SECRET` unset → open | High |
| 6 | Password reset email | TODO, tokens in plaintext; no rate limit on reset | Medium |
| 7 | Test suite | none at all | High (reproducibility) |
| 8 | `assignTicket` write atomicity | two separate DB calls (update + timeline) | Medium |
| 9 | SLA timezone handling | ignores `BusinessHours.timezone`, local time | High (correctness) |
| 10 | Schedule-action permission vs ticket closure | Technician lacks `ticket.close` (workflow gap, not a bug) | Medium |
| 11 | Seed default admin | no `NODE_ENV` guard | Medium (ops) |

---

## 12. Risks / cautions

- **Security:** read-path IDOR (1–4) contradicts the project's own non-negotiable rule that data reads must be authorized server-side.
- **Correctness:** business-hours math ignores `BusinessHours.timezone`; minute-by-minute loop.
- **Data:** `adjustStock` read-modify-write race; `seatsUsed` never maintained; `TicketSequence` create-path can collide on two simultaneous first tickets.
- **Operations:** seed sets known demo credentials; single squashed migration; no tests/CI; `UPSTASH_*` scaffolded but unused; `@next/swc-win32-x64-msvc` platform-specific dependency; `puppeteer-core` unused.
- **Doc drift:** `STATUS.md`/`PROGRESS.md` claim test results that cannot be reproduced (no test files). `PROJECT_ANALYSIS.md` was produced from the same code review and is consistent with the findings here.

---

## 13. Open items (must verify externally)

| # | Question | Why it matters |
|---|---|---|
| 1 | Does the deployed DB match `prisma/schema.prisma` (single migration 20260927071632_init)? | Undetected drift without a live DB check |
| 2 | Was the leaked secret in chat actually rotated? | Security posture |
| 3 | Which storage is intended for production — Vercel Blob, S3, or something else? | Attachment privacy (blob public URLs) |
| 4 | Is business-hours SLA actually required, or calendar-hours acceptable? | Drives whether the timezone bug matters |
| 5 | Is Neon permanent or is self-hosted Postgres planned? | Pooling/ops decisions |
| 6 | Expected scale (100 vs thousands of users)? | Justifies pooling/caching |
| 7 | Should technicians be able to assign themselves tickets? | RBAC design (role bundle gap) |
| 8 | Was a test suite ever run, and can it be restored? | Reproducibility of status claims |
| 9 | Is Recharts intended for Reports (installed, unused there)? | Unfinished feature |
| 10 | Is email delivery (Resend/SMTP/APNS) approved? | Completes password reset flow |
| 11 | Is SSO (Entra/Google/LDAP) on the near-term roadmap? | Architecture priority |
| 12 | Who owns role/permission administration (no `role.manage` UI)? | Admin workflow |
| 13 | Is `anto - refine` the intended storage for attachments (no public URLs)? | `Blob` public-key design |
| 14 | Is `ticket.delete` wanted (only the key exists, no UI)? | Feature decision |

---

## 14. Final read

**What the codebase is:** a broad, well-structured ITSM scaffold — Pluggable RBAC, server-enforced mutations, atomic ticket numbering, data-driven priority matrix, workflow, SLA pause bookkeeping, audit trail, QR public view, and atomic stock decrement — are all implemented correctly in intent. The read-path authorization is the dominant defect: several list/detail pages grant any authenticated user full visibility of tickets, assets, inventory, and software. There is no test suite and the status docs reference results that cannot be reproduced.

**What is real vs. claimed (glossary):** every bullet above is taken from code that exists in `src/` and `prisma/schema.prisma`; a claim with no code evidence is marked **"ยังไม่พบหลักฐาน"**. Anything marked "suggestion"/"proposal" here is not a proposal — it is the status of what exists, flagged as such.
