# IT Service Desk & Asset Management Platform

Production-ready Full-Stack Web Application — ศูนย์กลาง IT Service Desk, Helpdesk, ITAM, Inventory, Software/License, SLA, Knowledge Base, Reports, Audit.

## Stack

- Next.js 15 App Router · React 19 · TypeScript strict
- Tailwind CSS + shadcn/ui-style primitives + Lucide + Recharts + RHF + Zod
- PostgreSQL (Vercel Postgres / external) + Prisma ORM
- Auth.js v5 (credentials + bcrypt, pluggable SSO: Entra ID/Google/LDAP — see `src/lib/sso.ts`)
- Vercel Blob / S3-compatible storage abstraction (`src/lib/storage.ts`)
- Vercel deploy + Analytics + Speed Insights

## Quickstart

> มือใหม่ / คนจะโคลนไปรันทดสอบ: อ่าน `GETTING_STARTED.md` (คู่มือทีละขั้นภาษาไทย)

```bash
cp .env.example .env        # fill DATABASE_URL, AUTH_SECRET
docker compose up -d        # local Postgres
npm install
npx prisma migrate dev
npm run db:seed             # admin@company.local / Admin123!
npm run dev                 # http://localhost:3000
```

Demo accounts (seed): `admin@company.local / Admin123!`, `tech@company.local / Tech123!`, `employee@company.local / Emp12345!`

## Architecture highlights

- **RBAC server-enforced**: `requirePermission()` inside every Server Action / Route Handler (`src/lib/auth-helpers.ts`). UI hiding is never the control.
- **Ticket numbering**: atomic `TicketSequence` upsert — never `COUNT(*)` (`src/lib/ticket-number.ts`).
- **Priority**: Impact × Urgency matrix, data-driven via `SystemSetting.priority_matrix` (`src/lib/priority-matrix.ts`).
- **Workflow**: guarded transitions + TimelineEvent on every change (`src/lib/workflow.ts`, `src/actions/tickets.ts`).
- **SLA engine**: per-priority targets, business-hours + holidays, pause intervals, computed state (`src/lib/sla-engine.ts`, cron `/api/cron/sla-check`).
- **Stock safety**: worklog + stock txn + decrement in one DB transaction.
- **QR**: `/scan/{id}` restricted public view (tag/name/status only) + Report Problem → linked ticket.
- **Audit**: append-only `AuditLog` on all mutations (`src/lib/audit.ts`).
- **Validation**: Zod schemas shared client + server (`src/lib/validations.ts`).

## Deploy (Vercel)

1. Create Vercel Postgres → copy `DATABASE_URL`/`DIRECT_URL`.
2. Set `AUTH_SECRET` (`openssl rand -base64 32`), `NEXT_PUBLIC_APP_URL`, `BLOB_READ_WRITE_TOKEN`.
3. `npx prisma migrate deploy` then deploy. Cron `*/5` SLA check is in `vercel.json`.

## Project map

- `prisma/schema.prisma` — full data model · `prisma/seed.ts` — roles/permissions/demo data
- `auth.ts`, `middleware.ts` — session + route guard
- `src/lib/` — db, permissions, sla-engine, workflow, storage, rate-limit, sso
- `src/actions/` — tickets, assets/inventory, auth
- `src/app/(dashboard)/` — dashboard, tickets, assets, inventory, software, knowledge, users, reports, audit, settings, vendors
- `src/app/api/` — health, tickets REST, cron sla-check, public asset lookup
คุณคือ Senior Technical Writer ที่เชี่ยวชาญการทำ Table-Driven Documentation งานของคุณคือการจัดระเบียบข้อมูลทางเทคนิคที่ซับซ้อนให้ออกมาเป็นรูปแบบ Markdown Table เท่านั้น โดยยึดหลักการ 1 ประเด็นย่อย = 1 Row ห้ามเขียนบรรยายเป็นย่อหน้ายาวๆ และให้คิดโครงสร้าง Columns ที่ตอบโจทย์การกวาดสายตาอ่านเร็ว (Scannability) เสมอ