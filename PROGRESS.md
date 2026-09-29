# บันทึกความคืบหน้า (PROGRESS LOG)

> ไฟล์แยกเฉพาะสำหรับติดตามงาน — อ่านไฟล์นี้ไฟล์เดียวรู้เรื่องทั้งหมด
> สถานะสั้น ๆ ดูที่ `STATUS.md` | วิธีรันดูที่ `GETTING_STARTED.md`

## สรุปสถานะปัจจุบัน (2026-09-28)

| รายการ | สถานะ |
|---|---|
| โค้ดบน GitHub | ✅ ล่าสุด (`HKXC/IT-SERVICE-DESK-ONE`, branch `main`) |
| Preview local (`:3000`) | ✅ รันอยู่ (`/api/health` เขียว) |
| Deploy Vercel | ⬜ รอคนกรอก env 4 ตัว + กด Deploy |
| งานค้างที่ผมทำได้ | ✅ ไม่มีแล้ว (ตรวจเมื่อ 2026-09-28) |

## ทำเสร็จแล้ว (ทั้งหมด)

| # | งาน | หลักฐาน |
|---|---|---|
| 1 | Scaffold Next.js 15 + TS strict + Tailwind + Prisma | `package.json`, `tsconfig.json` |
| 2 | Prisma schema ทุกโมดูล + migrate บน Neon | `prisma/schema.prisma`, `prisma/migrations/20260927071632_init/` |
| 3 | Auth.js + RBAC server-side + rate limit + security headers | `src/auth.ts`, `src/lib/auth-helpers.ts`, `middleware.ts` |
| 4 | สร้าง route `[...nextauth]` ที่หาย (login ใช้ไม่ได้ทั้งระบบ) | `src/app/api/auth/[...nextauth]/route.ts` |
| 5 | SLA engine + ticket numbering + priority matrix + workflow | `src/lib/sla-engine.ts` ฯลฯ |
| 6 | UI หลักครบ: dashboard, tickets, assets+QR, inventory, software, KB, users, reports, audit, settings, vendors | `src/app/(dashboard)/*` |
| 7 | S3-compatible upload + ไฟล์แนบ ticket (E2E 20/20) | `src/lib/storage.ts`, `api/tickets/[id]/attachments` |
| 8 | ปุ่มดาวน์โหลดไฟล์แนบ (S3/proxy/redirect) | `api/.../[aid]/download/route.ts` |
| 9 | Assign ช่าง + worklog + ตัดสต็อก parts บนหน้า ticket | `src/components/tickets/ticket-ops.tsx` |
| 10 | Asset ops (เปลี่ยนสถานะ/assign/retire) + ฟอร์มครบ 24 ฟิลด์ | `src/components/assets/*` |
| 11 | ซ่อมโฟลว์ scan → login → new ticket (asset ติดมาด้วย) | `login-form.tsx`, `new-ticket-form.tsx` |
| 12 | UX forgot/reset (loading/error/guard/redirect) | `src/app/(auth)/*` |
| 13 | `loading.tsx` / `error.tsx` / `not-found.tsx` (global + dashboard) | `src/app/*` |
| 14 | Search ใช้งานจริง + pagination + active filters + audit/assets search | `tickets/page.tsx`, `topbar.tsx` |
| 15 | กระดิ่ง notifications + mark-read + เมนูมือถือ | `api/notifications`, `dashboard-shell.tsx` |
| 16 | CRUD: inventory, vendors, users, software-license, KB, SLA/matrix/holiday | `src/actions/manage.ts`, `*-forms.tsx` |
| 17 | แก้ pool Neon (`connection_limit=5`) กัน connection ร่วง | `.env`, `.env.example` |
| 18 | เอกสาร + push GitHub (3 commits) | `README/GETTING_STARTED/STATUS/PROGRESS.md` |

## งานค้าง (พร้อมเจ้าของ)

| # | งาน | เจ้าของ | วิธีทำต่อ |
|---|---|---|---|
| 1 | Deploy Vercel (env 4 ตัว + Deploy) | คุณ | Vercel Dashboard → Env → Deploy |
| 2 | อีเมล reset-password จริง | พักไว้ (คุณสั่งข้าม) | ส่ง SMTP/Resend key มาเมื่อพร้อม |
| 3 | Rotate secret ที่หลุดในแชต | คุณ | Neon/GitHub/Vercel dashboard |
| 4 | SSO (Entra ID/Google) | อนาคต | โครงพร้อมใน `src/lib/sso.ts` |

## การตัดสินใจสำคัญ (Decision Log)

| วันที่ | เรื่อง | ตัดสินใจ |
|---|---|---|
| 2026-09-27 | ฐานข้อมูล | ใช้ Neon ฟรี (ไม่มี Docker) — pooler=app, direct=migrate |
| 2026-09-27 | S3 | ใช้ Neon S3-compatible, สร้าง bucket `it-servicedesk-uploads` แล้ว |
| 2026-09-27 | โหมดรัน | Production build (`build`+`start`) ไม่ใช่ dev |
| 2026-09-27 | Env บน Vercel | จำเป็นจริง 4 ตัว (`DATABASE_URL/DIRECT_URL/AUTH_SECRET/AUTH_TRUST_HOST`) ที่เหลือนอกจากนี้คือแนะนำ |
| 2026-09-27 | อีเมล reset | ข้ามไปก่อนตามคำสั่ง |
| 2026-09-27 | Repo | Public → ให้ปิดเป็น Private ได้ (ตรวจแล้วไม่มี secret ใน repo) |
| 2026-09-28 | ไฟล์ติดตามงาน | แยก `PROGRESS.md` ฉบับนี้เป็นไฟล์เฉพาะ |

## ผลทดสอบล่าสุด

| ชุดทดสอบ | ผล |
|---|---|
| `tsc --noEmit` | 0 errors (ตรวจซ้ำ 2026-09-28, branch `ui/ux-enhance`) |
| `next build` | ผ่าน 33 routes (เพิ่มจาก 26 หลังรวม theme switcher) |
| `/api/health` (`next start`) | `{"ok":true}` เขียว |
| Test files ใน repo | ไม่มี — E2E เดิมอ้างอิงผลรอบก่อน (API 26/26, Browser 16/17) |
| TODO ในโค้ด | 1 จุด (`src/actions/auth.ts:46` อีเมล — พักไว้) |
| ข้อมูลทดสอบค้าง | 0 |
