import { z } from "zod";

export const pagingSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional().default(""),
  sort: z.string().trim().optional(),
  dir: z.enum(["asc", "desc"]).optional(),
});

export const reportQuerySchema = pagingSchema.extend({
  pageSize: z.coerce.number().int().positive().max(5000).optional().default(20),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  export: z.enum(["csv"]).optional(),
});

export const optionalText = (max: number) =>
  z.union([z.string().trim().max(max), z.null(), z.undefined()]).transform((value) => {
    const trimmed = typeof value === "string" ? value.trim() : "";
    return trimmed ? trimmed : null;
  });

export const requiredDecimal = z.string().trim().min(1, "Enter a number.");

export const inventoryUnitSchema = z.enum(["SQ_FT", "SQ_M", "RUNNING_FT", "METER", "PIECE", "SHEET", "KILOGRAM"]);
