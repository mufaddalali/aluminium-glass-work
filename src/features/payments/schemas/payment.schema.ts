import { z } from "zod";
import { optionalText, pagingSchema, requiredDecimal } from "@/server/validation/common";

export const paymentSchema = z.object({
  invoiceId: z.string().min(1, "Choose an invoice."),
  kind: z.enum(["PAYMENT", "REFUND"]).default("PAYMENT"),
  amount: requiredDecimal,
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CARD", "MOBILE_WALLET", "OTHER"]),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  reference: optionalText(80),
  notes: optionalText(400),
  idempotencyKey: optionalText(80),
});

export const paymentListSchema = pagingSchema.extend({
  from: z.string().optional().or(z.literal("")),
  to: z.string().optional().or(z.literal("")),
  kind: z.enum(["PAYMENT", "REFUND", ""]).optional(),
});
