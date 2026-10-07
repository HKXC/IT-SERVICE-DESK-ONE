-- Scope reduction: remove out-of-scope subsystems, downgrade Asset, collapse roles.

-- ── Asset: reduce status enum + remap existing values ───────────────────────
ALTER TYPE "AssetStatus" RENAME TO "AssetStatus_old";
CREATE TYPE "AssetStatus" AS ENUM ('IN_STOCK', 'ASSIGNED', 'REPAIR', 'RETIRED');

ALTER TABLE "Asset" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Asset" ALTER COLUMN "status" TYPE "AssetStatus"
  USING (CASE "status"::text
    WHEN 'IN_STOCK' THEN 'IN_STOCK'
    WHEN 'REQUESTED' THEN 'IN_STOCK'
    WHEN 'PURCHASED' THEN 'IN_STOCK'
    WHEN 'RECEIVED' THEN 'IN_STOCK'
    WHEN 'TRANSFER' THEN 'IN_STOCK'
    WHEN 'RESERVED' THEN 'IN_STOCK'
    WHEN 'ASSIGNED' THEN 'ASSIGNED'
    WHEN 'IN_USE' THEN 'ASSIGNED'
    WHEN 'REPAIR' THEN 'REPAIR'
    WHEN 'MAINTENANCE' THEN 'REPAIR'
    WHEN 'LOST' THEN 'RETIRED'
    WHEN 'RETIRED' THEN 'RETIRED'
    WHEN 'DISPOSED' THEN 'RETIRED'
    ELSE 'IN_STOCK' END)::"AssetStatus";
ALTER TABLE "Asset" ALTER COLUMN "status" SET DEFAULT 'IN_STOCK';

ALTER TABLE "AssetHistoryEvent" ALTER COLUMN "fromStatus" TYPE "AssetStatus"
  USING (CASE "fromStatus"::text
    WHEN 'IN_STOCK' THEN 'IN_STOCK' WHEN 'REQUESTED' THEN 'IN_STOCK'
    WHEN 'PURCHASED' THEN 'IN_STOCK' WHEN 'RECEIVED' THEN 'IN_STOCK'
    WHEN 'TRANSFER' THEN 'IN_STOCK' WHEN 'RESERVED' THEN 'IN_STOCK'
    WHEN 'ASSIGNED' THEN 'ASSIGNED' WHEN 'IN_USE' THEN 'ASSIGNED'
    WHEN 'REPAIR' THEN 'REPAIR' WHEN 'MAINTENANCE' THEN 'REPAIR'
    WHEN 'LOST' THEN 'RETIRED' WHEN 'RETIRED' THEN 'RETIRED'
    WHEN 'DISPOSED' THEN 'RETIRED' ELSE NULL END)::"AssetStatus";
ALTER TABLE "AssetHistoryEvent" ALTER COLUMN "toStatus" TYPE "AssetStatus"
  USING (CASE "toStatus"::text
    WHEN 'IN_STOCK' THEN 'IN_STOCK' WHEN 'REQUESTED' THEN 'IN_STOCK'
    WHEN 'PURCHASED' THEN 'IN_STOCK' WHEN 'RECEIVED' THEN 'IN_STOCK'
    WHEN 'TRANSFER' THEN 'IN_STOCK' WHEN 'RESERVED' THEN 'IN_STOCK'
    WHEN 'ASSIGNED' THEN 'ASSIGNED' WHEN 'IN_USE' THEN 'ASSIGNED'
    WHEN 'REPAIR' THEN 'REPAIR' WHEN 'MAINTENANCE' THEN 'REPAIR'
    WHEN 'LOST' THEN 'RETIRED' WHEN 'RETIRED' THEN 'RETIRED'
    WHEN 'DISPOSED' THEN 'RETIRED' ELSE NULL END)::"AssetStatus";
DROP TYPE "AssetStatus_old";

-- ── Asset: drop enterprise columns ──────────────────────────────────────────
ALTER TABLE "Asset" DROP COLUMN "category";
ALTER TABLE "Asset" DROP COLUMN "manufacturer";
ALTER TABLE "Asset" DROP COLUMN "cpu";
ALTER TABLE "Asset" DROP COLUMN "ram";
ALTER TABLE "Asset" DROP COLUMN "storage";
ALTER TABLE "Asset" DROP COLUMN "gpu";
ALTER TABLE "Asset" DROP COLUMN "os";
ALTER TABLE "Asset" DROP COLUMN "osVersion";
ALTER TABLE "Asset" DROP COLUMN "hostname";
ALTER TABLE "Asset" DROP COLUMN "ipAddress";
ALTER TABLE "Asset" DROP COLUMN "macAddress";
ALTER TABLE "Asset" DROP COLUMN "purchaseDate";
ALTER TABLE "Asset" DROP COLUMN "purchasePrice";
ALTER TABLE "Asset" DROP COLUMN "warrantyStart";
ALTER TABLE "Asset" DROP COLUMN "warrantyEnd";
ALTER TABLE "Asset" DROP COLUMN "departmentId";
ALTER TABLE "Asset" DROP COLUMN "locationId";
ALTER TABLE "Asset" DROP COLUMN "notes";
ALTER TABLE "Asset" DROP COLUMN "vendorId";
ALTER TABLE "AssetHistoryEvent" DROP COLUMN "cost";

-- ── Drop out-of-scope tables (dependents first) ─────────────────────────────
DROP TABLE "LicenseAssignment";
DROP TABLE "License";
DROP TABLE "Software";
DROP TABLE "StockTransaction";
DROP TABLE "WorkLog";
DROP TABLE "InventoryItem";
DROP TABLE "KnowledgeArticle";
DROP TABLE "KnowledgeCategory";
DROP TABLE "Notification";
DROP TABLE "AuditLog";
DROP TABLE "TicketRelation";
DROP TABLE "RolePermission";
DROP TABLE "Permission";
DROP TABLE "Vendor";
DROP TYPE "StockTxnType";
DROP TYPE "NotificationChannel";

-- ── Roles: exactly User · Technician · Administrator ────────────────────────
UPDATE "Role" SET "name" = 'User' WHERE "name" = 'Employee';
DELETE FROM "Role" WHERE "name" NOT IN ('User', 'Technician', 'Administrator');
