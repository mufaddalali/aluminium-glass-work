import { z } from "zod";
import { optionalText, pagingSchema, requiredDecimal, inventoryUnitSchema } from "@/server/validation/common";

export const lineSchema = z.object({
  productId: optionalText(80),
  itemName: optionalText(160),
  description: optionalText(1000),
  sourceType: z.enum(["STOCK", "OUTSIDE_PURCHASE"]),
  quantity: requiredDecimal,
  unit: inventoryUnitSchema.nullable().optional(),
  width: optionalText(20),
  height: optionalText(20),
  dimensionUnit: z.enum(["MM", "CM", "IN", "FT", "M"]).nullable().optional(),
  pieceCount: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.coerce.number().int().positive().nullable().optional(),
  ),
  unitPrice: requiredDecimal,
  discountAmount: optionalText(20),
  purchaseCost: optionalText(20),
  supplierName: optionalText(160),
  supplierReference: optionalText(160),
  purchaseNotes: optionalText(500),
});

export const invoiceSchema = z.object({
  customerId: z.string().min(1, "Choose a customer."),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).nullable(),
  discountAmount: optionalText(20),
  notes: optionalText(2000),
  terms: optionalText(2000),
  lines: z.array(lineSchema).min(1, "Add at least one line."),
});

export const voidSchema = z.object({
  reason: z.string().trim().min(3, "Enter a reason.").max(400),
});

export const invoiceListSchema = pagingSchema.extend({
  status: z.enum(["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "VOID", ""]).optional(),
  customerId: z.string().optional().or(z.literal("")),
  from: z.string().optional().or(z.literal("")),
  to: z.string().optional().or(z.literal("")),
});
