# สถานะโปรเจกต์ล่าสุด (STATUS)

> อัปเดต: 2026-09-27 — ไฟล์นี้คือแหล่งความจริงเดียวของสถานะงาน

## ตอนนี้ทำอะไรอยู่

| รายการ | รายละเอียด |
|---|---|
| งานปัจจุบัน | Deploy ขึ้น Vercel |
| ถึงขั้นไหน | โค้ดพร้อม 100% / repo พร้อม / รอกรอก env 12 ตัวบน Dashboard แล้วกด Deploy |
| ติดอะไร | รอคนกด (ต้องทำในเบราว์เซอร์): Settings → Environment Variables → Redeploy |
| วิธีรันดูชั่วคราว | `npm run start` ในเครื่อง → `http://localhost:3000` |

## ทำอะไรเสร็จแล้วบ้าง

| # | งาน | หลักฐาน |
|---|---|---|
| 1 | Scaffold Next.js 15 + TS strict + Tailwind + Prisma | `package.json`, `tsconfig.json` |
| 2 | Prisma schema ครบทุกโมดูล (ticket/asset/SLA/RBAC/audit/ฯลฯ) | `prisma/schema.prisma` + migrate บน Neon แล้ว |
| 3 | Auth.js + RBAC server-side + security headers + rate limit | `src/auth.ts`, `src/lib/auth-helpers.ts` |
| 4 | SLA engine + ticket numbering + priority matrix + workflow | `src/lib/sla-engine.ts` ฯลฯ |
| 5 | UI ครบ: dashboard, tickets, assets+QR, inventory, software, KB, users, reports, audit, settings | `src/app/(dashboard)/*` |
| 6 | S3-compatible upload + ระบบไฟล์แนบ ticket (E2E 20/20) | `src/lib/storage.ts`, `api/tickets/[id]/attachments` |
| 7 | ซ่อม route `[...nextauth]` ที่หาย (login ใช้ไม่ได้ทั้งระบบ) | `src/app/api/auth/[...nextauth]/route.ts` |
| 8 | Seed + build + preview รันได้ (`/api/health` เขียว) | `prisma/seed.ts`, `.next` |
| 9 | เอกสาร `GETTING_STARTED.md` (table-driven) + `README.md` | — |
| 10 | Git init + push ขึ้น GitHub | `HKXC/IT-SERVICE-DESK-ONE`, branch `main` |

## ยังเหลืออะไร

| # | งาน | ระดับ | หมายเหตุ |
|---|---|---|---|
| 1 | Deploy Vercel (กรอก env + กด Deploy) | สูง | รอคนทำใน Dashboard |
| 2 | ปุ่มดาวน์โหลดไฟล์แนบบน S3 (ตอนนี้เปิดได้เฉพาะ Blob URL) | สูง | ต้องเพิ่ม API download + ปุ่ม |
| 3 | ส่งอีเมล reset-password จริง (ตอนนี้แค่ log token) | สูง | ต้องมี SMTP/Resend key |
| 4 | `loading.tsx` / `error.tsx` ทุก route (กฎ ASTRA ข้อ 2) | กลาง | ตอนนี้มีเฉพาะจุดที่ทำใหม่ |
| 5 | ช่อง search บน topbar (ตอนนี้แค่ placeholder) | ต่ำ | — |
| 6 | Rotate secret ที่เคยหลุดในแชต (Neon/S3/GitHub/Vercel token) | สูง | ทำบน dashboard ของแต่ละเจ้า |
| 7 | SSO (Entra ID/Google) | อนาคต | โครงพร้อมใน `src/lib/sso.ts` |

## รันในเครื่อง (cheat)

| เป้าหมาย | คำสั่ง |
|---|---|
| รันดู | `npm run start` → `http://localhost:3000` |
| หยุด | `Ctrl+C` (ห้ามรัน `dev` ซ้อนกับ `start`) |
| Login ทดสอบ | `admin@company.local` / `Admin123!` |

## กฎเหล็กประจำโปรเจกต์

| ข้อ | กฎ |
|---|---|
| 1 | ห้าม stub/TODO — ทุกฟังก์ชันต้องจบกระบวนการ |
| 2 | ทุกหน้ามี loading + empty + error states |
| 3 | ส่งงานต้องผ่านตาราง ASTRA 3 ชั้นก่อนเสมอ |
