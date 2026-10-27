import { z } from "zod";
import { optionalText, pagingSchema, requiredDecimal } from "@/server/validation/common";

export const productSchema = z.object({
  name: z.string().trim().min(1, "Enter a product name.").max(160),
  quantity: requiredDecimal,
  defaultSellingPrice: requiredDecimal,
  description: optionalText(1000),
});

export const productListSchema = pagingSchema.extend({
  stock: z.enum(["out", ""]).optional(),
});

export const receiveStockSchema = z.object({
  productId: z.string().min(1, "Choose a product."),
  quantity: requiredDecimal,
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  costPrice: optionalText(20),
  supplierName: optionalText(120),
  supplierReference: optionalText(120),
  reason: z.string().trim().min(3, "Enter a reason.").max(300),
  movementType: z.enum(["INITIAL", "RECEIPT", "MANUAL_ADD", "CORRECTION", "CUSTOMER_RETURN"]),
});

export const removeStockSchema = z.object({
  productId: z.string().min(1, "Choose a product."),
  quantity: requiredDecimal,
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  reason: z.string().trim().min(3, "Enter a reason.").max(300),
  movementType: z.enum(["MANUAL_REMOVE", "CORRECTION"]),
});

export const movementListSchema = pagingSchema.extend({
  pageSize: z.coerce.number().int().positive().max(5000).optional().default(20),
  productId: z.string().optional().or(z.literal("")),
  direction: z.enum(["IN", "OUT", ""]).optional(),
  from: z.string().optional().or(z.literal("")),
  to: z.string().optional().or(z.literal("")),
  export: z.enum(["csv"]).optional(),
});
