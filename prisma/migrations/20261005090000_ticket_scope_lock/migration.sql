-- Ticket scope lock: reduce the ticket vocabulary and drop the Impact×Urgency
-- machinery. Existing rows are remapped so no data is lost.

-- ── TicketType: INCIDENT | SERVICE_REQUEST ──────────────────────────────────
ALTER TYPE "TicketType" RENAME TO "TicketType_old";
CREATE TYPE "TicketType" AS ENUM ('INCIDENT', 'SERVICE_REQUEST');
ALTER TABLE "Ticket" ALTER COLUMN "type" TYPE "TicketType"
  USING (CASE "type"::text
    WHEN 'INCIDENT' THEN 'INCIDENT'
    WHEN 'PROBLEM' THEN 'INCIDENT'
    WHEN 'SERVICE_REQUEST' THEN 'SERVICE_REQUEST'
    WHEN 'REPAIR' THEN 'SERVICE_REQUEST'
    WHEN 'CHANGE_REQUEST' THEN 'SERVICE_REQUEST'
    WHEN 'ACCESS_REQUEST' THEN 'SERVICE_REQUEST'
    ELSE 'INCIDENT' END)::"TicketType";
DROP TYPE "TicketType_old";

-- ── TicketStatus: NEW | ASSIGNED | IN_PROGRESS | WAITING_USER | RESOLVED | CLOSED
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED');

ALTER TABLE "Ticket" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "status" TYPE "TicketStatus"
  USING (CASE "status"::text
    WHEN 'NEW' THEN 'NEW'
    WHEN 'ACKNOWLEDGED' THEN 'NEW'
    WHEN 'ASSIGNED' THEN 'ASSIGNED'
    WHEN 'ON_HOLD' THEN 'ASSIGNED'
    WHEN 'ESCALATED' THEN 'ASSIGNED'
    WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'
    WHEN 'WAITING_USER' THEN 'WAITING_USER'
    WHEN 'WAITING_VENDOR' THEN 'WAITING_USER'
    WHEN 'WAITING_PART' THEN 'WAITING_USER'
    WHEN 'RESOLVED' THEN 'RESOLVED'
    WHEN 'PENDING_CONFIRMATION' THEN 'RESOLVED'
    WHEN 'CLOSED' THEN 'CLOSED'
    ELSE 'NEW' END)::"TicketStatus";
ALTER TABLE "Ticket" ALTER COLUMN "status" SET DEFAULT 'NEW';

-- Timeline events also reference TicketStatus (nullable).
ALTER TABLE "TicketTimelineEvent" ALTER COLUMN "fromStatus" TYPE "TicketStatus"
  USING (CASE "fromStatus"::text
    WHEN 'NEW' THEN 'NEW'
    WHEN 'ACKNOWLEDGED' THEN 'NEW'
    WHEN 'ASSIGNED' THEN 'ASSIGNED'
    WHEN 'ON_HOLD' THEN 'ASSIGNED'
    WHEN 'ESCALATED' THEN 'ASSIGNED'
    WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'
    WHEN 'WAITING_USER' THEN 'WAITING_USER'
    WHEN 'WAITING_VENDOR' THEN 'WAITING_USER'
    WHEN 'WAITING_PART' THEN 'WAITING_USER'
    WHEN 'RESOLVED' THEN 'RESOLVED'
    WHEN 'PENDING_CONFIRMATION' THEN 'RESOLVED'
    WHEN 'CLOSED' THEN 'CLOSED'
    ELSE NULL END)::"TicketStatus";
ALTER TABLE "TicketTimelineEvent" ALTER COLUMN "toStatus" TYPE "TicketStatus"
  USING (CASE "toStatus"::text
    WHEN 'NEW' THEN 'NEW'
    WHEN 'ACKNOWLEDGED' THEN 'NEW'
    WHEN 'ASSIGNED' THEN 'ASSIGNED'
    WHEN 'ON_HOLD' THEN 'ASSIGNED'
    WHEN 'ESCALATED' THEN 'ASSIGNED'
    WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'
    WHEN 'WAITING_USER' THEN 'WAITING_USER'
    WHEN 'WAITING_VENDOR' THEN 'WAITING_USER'
    WHEN 'WAITING_PART' THEN 'WAITING_USER'
    WHEN 'RESOLVED' THEN 'RESOLVED'
    WHEN 'PENDING_CONFIRMATION' THEN 'RESOLVED'
    WHEN 'CLOSED' THEN 'CLOSED'
    ELSE NULL END)::"TicketStatus";
DROP TYPE "TicketStatus_old";

-- ── TicketPriority: LOW | MEDIUM | HIGH | CRITICAL ──────────────────────────
ALTER TYPE "TicketPriority" RENAME TO "TicketPriority_old";
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
ALTER TABLE "Ticket" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "priority" TYPE "TicketPriority"
  USING (CASE "priority"::text
    WHEN 'P1' THEN 'CRITICAL'
    WHEN 'P2' THEN 'HIGH'
    WHEN 'P3' THEN 'MEDIUM'
    WHEN 'P4' THEN 'LOW'
    ELSE 'MEDIUM' END)::"TicketPriority";
ALTER TABLE "Ticket" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';
DROP TYPE "TicketPriority_old";

-- ── Drop the Impact×Urgency machinery ───────────────────────────────────────
ALTER TABLE "Ticket" DROP COLUMN "impact";
ALTER TABLE "Ticket" DROP COLUMN "urgency";
DROP TYPE "ImpactLevel";
DROP TYPE "UrgencyLevel";

-- ── Remove the now-unused priority matrix setting ───────────────────────────
DELETE FROM "SystemSetting" WHERE "key" = 'priority_matrix';
