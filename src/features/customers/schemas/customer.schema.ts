import { z } from "zod";
import { optionalText, pagingSchema } from "@/server/validation/common";

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Enter the customer name.").max(160),
  phone: z.string().trim().min(6, "Enter a phone number.").max(30),
  alternatePhone: optionalText(30),
  email: z
    .union([z.string().trim().min(1).email("Enter a valid email address."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (value ? value : null)),
  address: optionalText(400),
  notes: optionalText(1000),
});

export const customerListSchema = pagingSchema.extend({
  active: z.enum(["true", "false", ""]).optional(),
});
