import { z } from "zod";

// Shared client+server validation. Import these in RHF forms AND Server Actions.

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export const ticketTypeSchema = z.enum(["INCIDENT", "SERVICE_REQUEST"]);

export const ticketPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const ticketCreateSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(10, "Please describe the issue in more detail"),
  type: ticketTypeSchema,
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  priority: ticketPrioritySchema.default("MEDIUM"),
  assetId: z.string().optional(),
  locationId: z.string().optional(),
});

export const ticketStatusSchema = z.enum([
  "NEW",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_USER",
  "RESOLVED",
  "CLOSED",
]);

export const commentSchema = z.object({
  ticketId: z.string().cuid(),
  body: z.string().min(1).max(10000),
  type: z.enum(["PUBLIC", "INTERNAL"]).default("PUBLIC"),
});

export const assetCreateSchema = z.object({
  assetTag: z.string().min(2).max(50),
  name: z.string().min(2).max(200),
  type: z
    .enum(["COMPUTER", "SERVER", "NETWORK", "PRINTER", "MOBILE", "OTHER"])
    .default("OTHER"),
  serialNumber: z.string().max(200).optional(),
  brand: z.string().max(200).optional(),
  model: z.string().max(200).optional(),
});

export const userCreateSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8, "Minimum 8 characters"),
  roleId: z.string().cuid(),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
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

export type LoginInput = z.infer<typeof loginSchema>;
export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;
