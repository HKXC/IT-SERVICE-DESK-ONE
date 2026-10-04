<!-- # วิธีเปิดโปรเจกต์และรันทดสอบ (Getting Started — Table Edition)

> อ่านตารางจากบนลงล่าง ทำตามคอลัมน์ซ้ายไปขวา | ภาพรวมระบบดูที่ `README.md`

## 1. สิ่งที่ต้องมีก่อนเริ่ม

| สิ่งที่ต้องมี | เงื่อนไข | คำสั่งตรวจ |
|---|---|---|
| Node.js | v20 ขึ้นไป | `node --version` |
| Git | เวอร์ชันใดก็ได้ | `git --version` |
| บัญชี Neon (ฟรี) | สมัครที่ `neon.tech` | เปิด Dashboard ได้ |
| ไม่ต้องมี | Docker / PostgreSQL ในเครื่อง | — |

## 2. Clone และติดตั้ง

| ขั้น | คำสั่ง | เสร็จดูยังไง |
|---|---|---|
| 2.1 Clone | `git clone https://github.com/<user>/it-service-desk-platform.git` | ได้โฟลเดอร์โปรเจกต์ |
| 2.2 เข้าโฟลเดอร์ | `cd it-service-desk-platform` | prompt เปลี่ยน path |
| 2.3 ติดตั้ง | `npm install` | จบโดยไม่มี `npm error` |

| หมายเหตุ | รายละเอียด |
|---|---|
| โฟลเดอร์มีช่องว่าง | ครอบ quotes เสมอ เช่น `cd "IT SERVICE DESK"` |
| ติดตั้งครั้งแรก | ใช้เวลาหลายนาที อย่าปิดหน้าต่าง |

## 3. ตั้งค่า `.env`

| ขั้น | ทำอะไร | คำสั่ง/วิธี |
|---|---|---|
| 3.1 สร้างไฟล์ | ก๊อปจากตัวอย่าง | `Copy-Item .env.example .env` |
| 3.2 หา connection string | Neon Dashboard → ปุ่ม **Connect** | เปิด toggle **Pooled connection** ก๊อปเส้น 1 / ปิด toggle ก๊อปเส้น 2 |
| 3.3 สร้าง secret | สุ่มค่า 32-byte | `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"` |

| ตัวแปร | ค่าที่ใส่ | เอามาจากไหน |
|---|---|---|
| `DATABASE_URL` | เส้นที่ host มี `-pooler` | Neon (toggle เปิด) |
| `DIRECT_URL` | เส้นที่ host ไม่มี `-pooler` | Neon (toggle ปิด) |
| `AUTH_SECRET` | ค่าสุ่มจากขั้น 3.3 | สุ่มเอง |
| `AUTH_URL` | `http://localhost:3000` | คงเดิม |
| `AUTH_TRUST_HOST` | `true` | คงเดิม |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | คงเดิม |

| ท้าย URL ต้องมี | ตัวอย่าง |
|---|---|
| `?sslmode=require` | `.../neondb?sslmode=require` |

## 4. สร้างตาราง + ข้อมูลตัวอย่าง

| ขั้น | คำสั่ง | ผลที่ต้องได้ |
|---|---|---|
| 4.1 สร้างตาราง | `npx prisma migrate dev --name init` | `Your database is now in sync with your schema.` |
| 4.2 ใส่ข้อมูลตัวอย่าง | `npm run db:seed` | `Seed complete: ...` |

| Email | Password | Role | ใช้ทดสอบอะไร |
|---|---|---|---|
| `admin@company.local` | `Admin123!` | Administrator | ทุกเมนู + settings |
| `tech@company.local` | `Tech123!` | Technician | รับงาน/ซ่อม/ปิด ticket |
| `employee@company.local` | `Emp12345!` | Employee | แจ้งซ่อม/ดูงานตัวเอง |

## 5. รันและเปิดดู

| โหมด | คำสั่ง | เหมาะกับ |
|---|---|---|
| Dev | `npm run dev` | ลองเล่น / แก้โค้ดเห็นผลทันที |
| Production | `npm run build` แล้ว `npm run start` | เหมือนตอน deploy จริง |

| จุดตรวจ | URL/วิธี | ผลที่ต้องได้ |
|---|---|---|
| หน้าเว็บ | `http://localhost:3000` | เด้งไป `/login` |
| สุขภาพระบบ | `http://localhost:3000/api/health` | `{"ok":true,...}` |
| Login | ใช้อีเมลจากตารางข้อ 4 | เข้า Dashboard |

## 6. 5 สิ่งควรลอง (1 อย่าง = 1 แถว)

| ลำดับ | ไปที่ | ทำอะไร | พิสูจน์อะไร |
|---|---|---|---|
| 1 | + New Ticket | สร้าง ticket 1 ใบ | ได้เลข `INC-2026-000001` + เห็น SLA countdown |
| 2 | หน้า ticket | เปลี่ยน New → Assigned → In Progress → Resolved | workflow + timeline บันทึกทุกขั้น |
| 3 | `/assets` → เปิด asset | ดู QR + ประวัติซ่อม | QR สแกนได้ + มี flag ถ้าซ่อมบ่อย |
| 4 | Login สลับ `employee` / `admin` | เทียบเมนูซ้าย | เมนูไม่เท่ากัน (RBAC ทำงาน) |
| 5 | `/reports`, `/audit` | เปิดดูกราฟ + log | รายงานและ audit trail มีข้อมูล |

## 7. หยุด / รันใหม่

| เป้าหมาย | คำสั่ง/วิธี |
|---|---|
| หยุด server | กด `Ctrl + C` ในหน้าต่างที่รัน |
| รันใหม่คราวหน้า | `npm run dev` หรือ `npm run start` อย่างเดียว (ข้ามขั้น 1–4) |
| ดูข้อมูลดิบใน DB | `npm run db:studio` |

| ข้อเท็จจริง | รายละเอียด |
|---|---|
| ข้อมูลหายไหมเมื่อหยุด server | ไม่หาย อยู่บน Neon |
| ต้อง seed ซ้ำไหม | ไม่ต้อง ยกเว้นอยากรีเซ็ต |

## 8. ปัญหาที่เจอบ่อย (1 อาการ = 1 แถว)

| อาการ | สาเหตุ | วิธีแก้ |
|---|---|---|
| `Can't reach database` | string ผิด / ลืม `sslmode` / Neon ถูก suspend | ตรวจ URL / เปิด Neon dashboard ปลุก project |
| Prisma บ่น connection string | มี param ที่ไม่รองรับ เช่น `channel_binding` | ลบ `&channel_binding=require` ออกจากทั้ง 2 เส้น |
| Error 500 ตอน login | ลืม `AUTH_SECRET` / ลืม seed | ใส่ secret / รัน `npm run db:seed` |
| Port 3000 ถูกใช้แล้ว | server เก่าค้าง | `taskkill /F /IM node.exe` (ระวัง node ตัวอื่น) |
| `npm install` นาน/เหมือนค้าง | เน็ตช้า | รอให้จบ อย่าปิด |
| ไฟล์แนบหายหลัง restart | เก็บแบบชั่วคราวในโหมดทดสอบ | ต่อ Vercel Blob/S3 ก่อนใช้งานจริง |

## 9. Cheat Sheet (ก๊อปทั้งก้อนรันได้)

| เป้าหมาย | คำสั่ง |
|---|---|
| Clone | `git clone https://github.com/<user>/it-service-desk-platform.git` |
| เข้าโฟลเดอร์ | `cd it-service-desk-platform` |
| ติดตั้ง | `npm install` |
| สร้าง env | `Copy-Item .env.example .env` |
| สร้างตาราง | `npx prisma migrate dev --name init` |
| ใส่ข้อมูลตัวอย่าง | `npm run db:seed` |
| รันโหมด dev | `npm run dev` |
| รันโหมด production | `npm run build` แล้ว `npm run start` |
| เปิดเว็บ | `http://localhost:3000` | -->
