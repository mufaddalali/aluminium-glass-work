import type { PageMeta } from "@/lib/types";
import { ApiError } from "@/server/errors/api-error";

export function pageArgs(page: number, pageSize: number) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function pageMeta(total: number, page: number, pageSize: number): PageMeta {
  return { page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(400, "INVALID_DATE", "Use a valid date.");
  }
  return new Date(`${value}T00:00:00.000Z`);
}

export function endOfDateOnly(value: string) {
  return new Date(`${value}T23:59:59.999Z`);
}

export function decimalToString(value: { toString(): string } | null | undefined) {
  return value == null ? null : value.toString();
}
