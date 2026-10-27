import type { BusinessSettings, Prisma, PrismaClient } from "@prisma/client";
import type { SettingsDto } from "@/lib/types";
import { prisma } from "@/server/db/prisma";
import { ApiError } from "@/server/errors/api-error";

type Db = Prisma.TransactionClient | PrismaClient;

const DEFAULT_SETTINGS = {
  id: "default",
  businessName: "Aluminium & Glass work",
  currency: "PKR",
  invoicePrefix: "INV",
  timeZone: "Asia/Karachi",
  taxEnabled: false,
  taxRate: "0.0000",
  taxLabel: "Tax",
  defaultTerms: "Payment is due by the date shown on this invoice.",
  defaultNotes: "Thank you for your business.",
};

export async function ensureSettings(db: Db = prisma) {
  return db.businessSettings.upsert({
    where: { id: "default" },
    update: {},
    create: DEFAULT_SETTINGS,
  });
}

export function toSettingsDto(row: BusinessSettings): SettingsDto {
  return {
    businessName: row.businessName,
    address: row.address,
    phone: row.phone,
    email: row.email,
    hasLogo: Boolean(row.logoBytes && row.logoBytes.length > 0),
    invoicePrefix: row.invoicePrefix,
    currency: row.currency,
    taxEnabled: row.taxEnabled,
    taxRate: row.taxRate.toString(),
    taxLabel: row.taxLabel,
    defaultTerms: row.defaultTerms,
    defaultNotes: row.defaultNotes,
    paymentTermDays: row.paymentTermDays,
    timeZone: row.timeZone,
  };
}

export async function getSettings() {
  return toSettingsDto(await ensureSettings());
}

export async function updateSettings(input: {
  businessName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  invoicePrefix: string;
  taxEnabled: boolean;
  taxRate: string;
  taxLabel: string;
  paymentTermDays?: number | null;
  timeZone: string;
}) {
  try {
    Intl.DateTimeFormat("en-GB", { timeZone: input.timeZone }).format(new Date());
  } catch {
    throw new ApiError(400, "INVALID_TIME_ZONE", "Enter a valid time zone, such as Asia/Karachi.");
  }
  const prefix = input.invoicePrefix.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!prefix) throw new ApiError(400, "INVALID_PREFIX", "The invoice prefix needs letters or numbers.");
  await ensureSettings();
  const row = await prisma.businessSettings.update({
    where: { id: "default" },
    data: {
      businessName: input.businessName.trim(),
      address: emptyToNull(input.address),
      phone: emptyToNull(input.phone),
      email: emptyToNull(input.email)?.toLowerCase() ?? null,
      invoicePrefix: prefix,
      taxEnabled: input.taxEnabled,
      taxRate: input.taxRate,
      taxLabel: input.taxLabel.trim() || "Tax",
      paymentTermDays: input.paymentTermDays ?? null,
      timeZone: input.timeZone,
    },
  });
  return toSettingsDto(row);
}

export async function saveLogo(bytes: Buffer, mimeType: string) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(mimeType)) {
    throw new ApiError(400, "INVALID_LOGO", "Upload a PNG, JPEG, or WebP logo.");
  }
  if (bytes.length > 512 * 1024) {
    throw new ApiError(400, "LOGO_TOO_LARGE", "The logo must be 512 KB or smaller.");
  }
  await ensureSettings();
  await prisma.businessSettings.update({
    where: { id: "default" },
    data: { logoBytes: new Uint8Array(bytes), logoMimeType: mimeType },
  });
}

export async function clearLogo() {
  await ensureSettings();
  await prisma.businessSettings.update({
    where: { id: "default" },
    data: { logoBytes: null, logoMimeType: null },
  });
}

export async function readLogo() {
  const row = await ensureSettings();
  if (!row.logoBytes || !row.logoMimeType) return null;
  return { bytes: Buffer.from(row.logoBytes), mimeType: row.logoMimeType };
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
