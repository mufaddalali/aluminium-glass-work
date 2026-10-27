import { z } from "zod";
import { optionalText, pagingSchema, requiredDecimal, inventoryUnitSchema } from "@/server/validation/common";

export { inventoryUnitSchema };

export const productSchema = z.object({
  sku: optionalText(40),
  name: z.string().trim().min(1, "Enter a product name.").max(160),
  categoryId: z.string().min(1, "Choose a category."),
  description: optionalText(1000),
  brand: optionalText(80),
  colour: optionalText(80),
  thickness: optionalText(40),
  inventoryUnit: inventoryUnitSchema,
  minimumStockLevel: requiredDecimal,
  defaultCostPrice: optionalText(20),
  defaultSellingPrice: requiredDecimal,
  openingQuantity: optionalText(20),
});

export const productListSchema = pagingSchema.extend({
  categoryId: z.string().optional().or(z.literal("")),
  active: z.enum(["true", "false", ""]).optional(),
  stock: z.enum(["low", "out", "alert", ""]).optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Enter a category name.").max(80),
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
