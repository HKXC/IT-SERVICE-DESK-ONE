import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } from "../src/lib/permissions";

const db = new PrismaClient();

async function main() {
  // Permissions
  for (const key of PERMISSIONS) {
    await db.permission.upsert({
      where: { key },
      update: {},
      create: { key, description: key },
    });
  }
  // Roles
  for (const [name, keys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = await db.role.upsert({
      where: { name },
      update: {},
      create: { name, isSystem: true, description: `${name} (system)` },
    });
    for (const key of keys) {
      const perm = await db.permission.findUnique({ where: { key } });
      if (perm) {
        await db.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
          update: {},
          create: { roleId: role.id, permissionId: perm.id },
        });
      }
    }
  }

  const adminRole = await db.role.findUnique({ where: { name: "Administrator" } });
  const techRole = await db.role.findUnique({ where: { name: "Technician" } });
  const empRole = await db.role.findUnique({ where: { name: "Employee" } });

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
        email, name,
        passwordHash: await bcrypt.hash(pw, 12),
        roleId, departmentId: itDept.id, locationId: hq.id,
      },
    });
  }

  await user("admin@company.local", "System Admin", "Admin123!", adminRole?.id);
  await user("tech@company.local", "IT Technician", "Tech123!", techRole?.id);
  await user("employee@company.local", "Demo Employee", "Emp12345!", empRole?.id);

  // SLA defaults
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

  await db.systemSetting.upsert({
    where: { key: "priority_matrix" },
    update: {},
    create: {
      key: "priority_matrix",
      value: {
        "HIGH:HIGH": "P1", "HIGH:MEDIUM": "P2", "HIGH:LOW": "P2",
        "MEDIUM:HIGH": "P2", "MEDIUM:MEDIUM": "P3", "MEDIUM:LOW": "P3",
        "LOW:HIGH": "P3", "LOW:MEDIUM": "P4", "LOW:LOW": "P4",
      },
    },
  });

  // Vendors / inventory / software / KB starters
  const vendor = await db.vendor.upsert({
    where: { name: "Default Supplier Co." },
    update: {},
    create: { name: "Default Supplier Co.", email: "sales@supplier.local" },
  });

  for (const [sku, name, cat, qty, min] of [
    ["RAM-16G-DDR4", "RAM 16GB DDR4", "RAM", 24, 5],
    ["SSD-1TB-NVME", "SSD 1TB NVMe", "SSD", 12, 4],
    ["ADP-65W-USBC", "Adapter 65W USB-C", "Adapter", 15, 5],
    ["MSE-WL-01", "Wireless Mouse", "Mouse", 30, 10],
  ] as const) {
    await db.inventoryItem.upsert({
      where: { sku }, update: {},
      create: { sku, name, category: cat, quantity: qty, minStock: min, vendorId: vendor.id },
    });
  }

  const sw = await db.software.upsert({
    where: { name_version: { name: "Microsoft 365", version: "E3" } },
    update: {},
    create: { name: "Microsoft 365", vendor: "Microsoft", version: "E3", category: "Productivity", licenseType: "SUBSCRIPTION" },
  });
  await db.license.upsert({
    where: { key: "DEMO-M365-001" },
    update: {},
    create: { softwareId: sw.id, key: "DEMO-M365-001", seatsTotal: 100, seatsUsed: 0, vendorId: vendor.id, expiryDate: new Date(Date.now() + 300 * 86400 * 1000) },
  });

  const cat = await db.knowledgeCategory.upsert({
    where: { slug: "getting-started" },
    update: {},
    create: { name: "Getting Started", slug: "getting-started" },
  });
  const admin = await db.user.findUnique({ where: { email: "admin@company.local" } });
  await db.knowledgeArticle.upsert({
    where: { slug: "how-to-request-help" },
    update: {},
    create: {
      title: "How to request IT help", slug: "how-to-request-help",
      summary: "Create a ticket, track SLA, confirm resolution.",
      body: "1. Go to Tickets → New Ticket.\n2. Pick type/category, impact & urgency (priority is auto-derived).\n3. Track the SLA countdown on the ticket page.\n4. Reply in Conversation; confirm when resolved.",
      categoryId: cat.id, authorId: admin?.id, isPublished: true,
    },
  });

  console.log("Seed complete: admin@company.local / Admin123!, tech@company.local / Tech123!, employee@company.local / Emp12345!");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
