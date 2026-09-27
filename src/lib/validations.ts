import { z } from "zod";

// Shared client+server validation. Import these in RHF forms AND Server Actions.

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export const ticketCreateSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(10, "Please describe the issue in more detail"),
  type: z.enum([
    "INCIDENT",
    "SERVICE_REQUEST",
    "REPAIR",
    "PROBLEM",
    "CHANGE_REQUEST",
    "ACCESS_REQUEST",
  ]),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  impact: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  urgency: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  assetId: z.string().optional(),
  locationId: z.string().optional(),
});

export const ticketStatusSchema = z.enum([
  "NEW",
  "ACKNOWLEDGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_USER",
  "WAITING_VENDOR",
  "WAITING_PART",
  "ON_HOLD",
  "ESCALATED",
  "RESOLVED",
  "PENDING_CONFIRMATION",
  "CLOSED",
]);

export const commentSchema = z.object({
  ticketId: z.string().cuid(),
  body: z.string().min(1).max(10000),
  type: z.enum(["PUBLIC", "INTERNAL"]).default("PUBLIC"),
});

export const workLogSchema = z.object({
  ticketId: z.string().cuid(),
  title: z.string().max(200).optional(),
  body: z.string().min(1).max(10000),
  timeSpentMin: z.coerce.number().int().min(0).max(10080).default(0),
  inventoryItemId: z.string().optional(),
  quantityUsed: z.coerce.number().int().min(0).max(1000).default(0),
});

export const assetCreateSchema = z.object({
  assetTag: z.string().min(2).max(50),
  name: z.string().min(2).max(200),
  type: z
    .enum(["COMPUTER", "SERVER", "NETWORK", "PRINTER", "MOBILE", "OTHER"])
    .default("OTHER"),
  category: z.string().optional(),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  cpu: z.string().optional(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  gpu: z.string().optional(),
  os: z.string().optional(),
  osVersion: z.string().optional(),
  hostname: z.string().optional(),
  ipAddress: z.string().optional(),
  macAddress: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.coerce.number().nonnegative().optional(),
  vendorId: z.string().optional(),
  warrantyStart: z.string().optional(),
  warrantyEnd: z.string().optional(),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
});

export const stockTxnSchema = z.object({
  itemId: z.string().cuid(),
  type: z.enum(["STOCK_IN", "STOCK_OUT", "ADJUSTMENT", "REPAIR_USAGE", "RETURN"]),
  quantity: z.coerce.number().int().min(1).max(100000),
  reason: z.string().max(500).optional(),
  ticketId: z.string().optional(),
});

export const userCreateSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8, "Minimum 8 characters"),
  roleId: z.string().cuid(),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
});

export const kbArticleSchema = z.object({
  title: z.string().min(5).max(200),
  summary: z.string().max(500).optional(),
  body: z.string().min(10),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
});

export const inventoryItemSchema = z.object({
  sku: z.string().min(2).max(50),
  name: z.string().min(2).max(200),
  category: z.string().min(1, "Category is required"),
  brand: z.string().optional(),
  model: z.string().optional(),
  quantity: z.coerce.number().int().min(0).max(1000000).default(0),
  minStock: z.coerce.number().int().min(0).max(1000000).default(5),
  locationId: z.string().optional(),
  unitCost: z.coerce.number().nonnegative().optional(),
  vendorId: z.string().optional(),
});

export const vendorSchema = z.object({
  name: z.string().min(2).max(200),
  contactPerson: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  taxId: z.string().max(50).optional(),
});

export const softwareSchema = z.object({
  name: z.string().min(2).max(200),
  vendor: z.string().max(200).optional(),
  version: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  licenseType: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
});

export const licenseSchema = z.object({
  softwareId: z.string().cuid(),
  key: z.string().max(200).optional(),
  seatsTotal: z.coerce.number().int().min(1).max(1000000).default(1),
  purchaseDate: z.string().optional(),
  expiryDate: z.string().optional(),
  cost: z.coerce.number().nonnegative().optional(),
  vendorId: z.string().optional(),
});

export const slaPolicySchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  p1ResponseMin: z.coerce.number().int().min(1).max(10080),
  p1ResolutionMin: z.coerce.number().int().min(1).max(43200),
  p2ResponseMin: z.coerce.number().int().min(1).max(10080),
  p2ResolutionMin: z.coerce.number().int().min(1).max(43200),
  p3ResponseMin: z.coerce.number().int().min(1).max(10080),
  p3ResolutionMin: z.coerce.number().int().min(1).max(43200),
  p4ResponseMin: z.coerce.number().int().min(1).max(10080),
  p4ResolutionMin: z.coerce.number().int().min(1).max(43200),
  atRiskPercent: z.coerce.number().int().min(1).max(99).default(75),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const holidaySchema = z.object({
  name: z.string().min(2).max(200),
  date: z.string().min(1, "Date is required"),
});

export const licenseAssignSchema = z.object({
  licenseId: z.string().cuid(),
  userId: z.string().cuid(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;
