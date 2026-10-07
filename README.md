# IT Helpdesk

Full-stack IT Helpdesk built on Next.js 15 (App Router), React 19, TypeScript strict,
Tailwind CSS, Prisma, and PostgreSQL. Authentication is Auth.js v5 with credentials + bcrypt.

The application is deliberately scoped to **six modules**:

| # | Module | What it covers |
|---|--------|----------------|
| 1 | Authentication & User | Sign in / sign out, password reset, user directory, 3 roles |
| 2 | Ticket Management | Create, assign, re-prioritise, and advance tickets through the workflow |
| 3 | Comment & Timeline | Public replies, internal notes, and a unified activity timeline |
| 4 | Asset Management | Light asset register tied to users and tickets |
| 5 | Dashboard | At-a-glance counts and status/type breakdowns |
| 6 | Report | Ticket breakdowns by status, type, priority, and technician |

## Roles

Only three roles exist, and every capability is enforced server-side:

| Role | Capabilities |
|------|--------------|
| User | Create tickets, view own tickets, comment |
| Technician | All User capabilities + work any ticket, manage assets |
| Administrator | All capabilities + manage users, SLA, holidays |

`src/lib/permissions.ts` defines the `ROLES`, `CAPABILITIES`, and `ROLE_CAPABILITIES` matrix.
`src/lib/auth-helpers.ts` exposes `requireCapability()` / `hasCapability()`, which are called
inside every Server Action and Route Handler. Hiding UI is never the access control.

## Ticket behaviour

- **Statuses**: `NEW → ASSIGNED → IN_PROGRESS → WAITING_USER → RESOLVED → CLOSED`.
  The only reopen path is `RESOLVED → IN_PROGRESS`.
- **Types**: `INCIDENT`, `SERVICE_REQUEST`. **Priorities**: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- Priority is set directly on the ticket — there is no impact × urgency matrix.
- Every state change writes a `TimelineEvent`; comments and events render in one unified timeline.
- Ticket numbers are allocated atomically via `TicketSequence` (never `COUNT(*)`).

## Quickstart

```bash
cp .env.example .env        # fill DATABASE_URL and AUTH_SECRET
docker compose up -d        # local PostgreSQL
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev                 # http://localhost:3000
```

Seed accounts:

| Email | Password | Role |
|-------|----------|------|
| admin@company.local | Admin123! | Administrator |
| tech@company.local | Tech123! | Technician |
| employee@company.local | Emp12345! | User |

## Verifying changes

```bash
npm run typecheck           # tsc --noEmit, strict
npm run build               # prisma generate && next build
```

There is no automated test suite; verify behaviour by running the app and exercising the flow
(log in → create → assign → advance a ticket).

## Project map

| Path | Contents |
|------|----------|
| `prisma/schema.prisma` | Reduced data model (users, tickets, comments, timeline, assets, SLA, roles) |
| `prisma/migrations/` | Ticket vocabulary lock + scope-reduction migrations |
| `prisma/seed.ts` | 3 roles, 3 demo users, default business hours + SLA |
| `auth.ts`, `middleware.ts` | Session handling and route guard |
| `src/lib/` | db, permissions, auth-helpers, workflow, sla-engine, validations, ticket-number |
| `src/actions/` | `tickets.ts`, `assets.ts`, `manage.ts` server actions |
| `src/app/(dashboard)/` | dashboard, tickets, assets, users, reports, settings |
| `src/app/api/` | `health`, `cron/sla-check`, ticket attachment routes |

## Deploy

1. Provision PostgreSQL and set `DATABASE_URL` / `DIRECT_URL`.
2. Set `AUTH_SECRET` (`openssl rand -base64 32`), `NEXT_PUBLIC_APP_URL`, and blob storage token.
3. Run `npx prisma migrate deploy`, then deploy. The `*/5` SLA-check cron is declared in `vercel.json`.
