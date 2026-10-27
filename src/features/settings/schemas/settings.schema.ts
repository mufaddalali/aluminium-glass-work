import { z } from "zod";
import { optionalText, requiredDecimal } from "@/server/validation/common";

export const settingsSchema = z.object({
  businessName: z.string().trim().min(1, "Enter the business name.").max(160),
  address: optionalText(400),
  phone: optionalText(40),
  email: z
    .union([z.string().trim().min(1).email("Enter a valid email address."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (value ? value : null)),
  invoicePrefix: z.string().trim().min(2, "Enter a prefix.").max(12),
  taxEnabled: z.boolean(),
  taxRate: requiredDecimal,
  taxLabel: z.string().trim().min(1).max(40),
  paymentTermDays: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((value, context) => {
    if (value == null || value === "") return null;
    const number = typeof value === "number" ? value : Number(value);
    if (!Number.isInteger(number) || number < 0 || number > 365) {
      context.addIssue({ code: "custom", message: "Enter a whole number from 0 to 365." });
      return z.NEVER;
    }
    return number;
  }),
  timeZone: z.string().trim().min(1, "Enter a time zone."),
});
