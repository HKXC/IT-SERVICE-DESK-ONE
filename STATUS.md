# สถานะโปรเจกต์ล่าสุด (STATUS)

> อัปเดต: 2026-09-28 — ไฟล์นี้คือแหล่งความจริงเดียวของสถานะงาน
> บันทึกความคืบหน้าแบบละเอียด: ดูที่ `PROGRESS.md`

## ตอนนี้ทำอะไรอยู่

| รายการ | รายละเอียด |
|---|---|
| งานปัจจุบัน | Deploy ขึ้น Vercel (รอบ้าน) — โค้ด push ครบแล้ว |
| preview local | `npm run start` → `http://localhost:3000` รันอยู่ เขียว |
| ติดอะไร | รอคนกดใน Vercel Dashboard: กรอก env 4 ตัว → Deploy |

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

| # | งาน | ระดับ | สถานะล่าสุด |
|---|---|---|---|
| 1 | Deploy Vercel (กรอก env 4 ตัว + กด Deploy) | สูง | รอคนทำใน Dashboard (จำเป็นแค่ 4 ตัว ไม่ใช่ 12) |
| 2 | ปุ่มดาวน์โหลดไฟล์แนบบน S3 | สูง | ✅ เสร็จ — API + ปุ่ม + E2E byte-compare ผ่าน |
| 3 | ส่งอีเมล reset-password จริง | สูง | พักไว้ตามคำสั่ง (ต้องมี SMTP/Resend key) |
| 4 | `loading.tsx` / `error.tsx` ทุก route | กลาง | ✅ เสร็จ — global + dashboard + 404 |
| 5 | ช่อง search บน topbar | ต่ำ | ✅ เสร็จ — ค้น tickets ได้จริง + ปุ่ม `/` |
| 6 | Rotate secret ที่เคยหลุดในแชต | สูง | ยังไม่ได้ทำ (ทำบน dashboard แต่ละเจ้า) |
| 7 | SSO (Entra ID/Google) | อนาคต | โครงพร้อมใน `src/lib/sso.ts` |
| 8 | ฟอร์มจัดการ: users/vendors/software-license/KB/inventory/SLA | สูง | ✅ เสร็จทั้งหมดคืนนี้ (ดูตารางทดสอบ) |
| 9 | ปุ่ม assign/worklog/ใช้ parts/asset ops/กระดิ่ง/เมนูมือถือ | สูง | ✅ เสร็จทั้งหมดคืนนี้ |

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

## ผลทดสอบคืนนี้ (ASTRA)

| ชุดทดสอบ | ผล |
|---|---|
| `tsc --noEmit` strict (ไม่มี `any`) | 0 errors (ตรวจซ้ำ 2026-09-28, branch `ui/ux-enhance`) |
| `next build` production | ผ่าน (33 routes — เพิ่มจาก 26 หลังรวม theme switcher) |
| `/api/health` บน `next start` | `{"ok":true}` เขียว |
| Test files ใน repo | ไม่มี (`scripts/`/`tests/`/`e2e/` ถูกลบไปแล้ว — E2E เดิม 26/26 + Browser 16/17 อ้างอิงผลรอบก่อน) |
| TODO/FIXME ในโค้ด | 1 จุด (`src/actions/auth.ts:46` ส่งอีเมล reset — พักไว้ตามคำสั่ง) |
