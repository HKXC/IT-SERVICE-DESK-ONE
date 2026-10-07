import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLES } from "../src/lib/permissions";

const db = new PrismaClient();

async function main() {
  // Roles — exactly User, Technician, Administrator
  for (const name of ROLES) {
    await db.role.upsert({
      where: { name },
      update: {},
      create: { name, isSystem: true, description: `${name} (system)` },
    });
  }

  const adminRole = await db.role.findUnique({ where: { name: "Administrator" } });
  const techRole = await db.role.findUnique({ where: { name: "Technician" } });
  const userRole = await db.role.findUnique({ where: { name: "User" } });

  const itDept = await db.department.upsert({
    where: { name: "IT" },
    update: {},
    create: { name: "IT", code: "IT" },
  });
  const hq = await db.location.upsert({
    where: { name: "HQ — Bangkok" },
    update: {},
    create: { name: "HQ — Bangkok", code: "HQ-BKK" },
  });

  async function user(email: string, name: string, pw: string, roleId?: string) {
    return db.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        passwordHash: await bcrypt.hash(pw, 12),
        roleId,
        departmentId: itDept.id,
        locationId: hq.id,
      },
    });
  }

  await user("admin@company.local", "System Admin", "Admin123!", adminRole?.id);
  await user("tech@company.local", "IT Technician", "Tech123!", techRole?.id);
  await user("employee@company.local", "Demo User", "Emp12345!", userRole?.id);

  // SLA defaults (kept)
  let bh = await db.businessHours.findUnique({ where: { name: "Default Business Hours" } });
  if (!bh) {
    bh = await db.businessHours.create({
      data: { name: "Default Business Hours", timezone: "Asia/Bangkok", workingDays: [1, 2, 3, 4, 5], startTime: "09:00", endTime: "18:00" },
    });
  }
  await db.sLAPolicy.upsert({
    where: { name: "Standard SLA" },
    update: {},
    create: {
      name: "Standard SLA", description: "P1 15m/4h · P2 30m/8h · P3 4h/24h · P4 8h/72h",
      isDefault: true, businessHoursId: bh.id,
      p1ResponseMin: 15, p1ResolutionMin: 240,
      p2ResponseMin: 30, p2ResolutionMin: 480,
      p3ResponseMin: 240, p3ResolutionMin: 1440,
      p4ResponseMin: 480, p4ResolutionMin: 4320,
      atRiskPercent: 75,
    },
  });

  console.log("Seed complete: admin@company.local / Admin123!, tech@company.local / Tech123!, employee@company.local / Emp12345!");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
