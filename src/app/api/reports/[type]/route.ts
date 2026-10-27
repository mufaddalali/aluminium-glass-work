import { reportQuerySchema } from "@/server/validation/common";
import { requireSession } from "@/server/auth/session";
import { csvResponse, ok, searchParams, withApi } from "@/server/http/response";
import { ApiError } from "@/server/errors/api-error";
import { REPORT_TYPES, getReport, reportToCsv, type ReportType } from "@/server/services/report.service";
import { endOfDateOnly, parseDateOnly } from "@/server/utils/paging";

type Context = { params: Promise<{ type: string }> };

export const GET = withApi<Context>(async (request, context) => {
  await requireSession();
  const { type } = await context.params;
  if (!REPORT_TYPES.includes(type as ReportType)) throw new ApiError(404, "NOT_FOUND", "Report not found.");
  const query = reportQuerySchema.parse(searchParams(request));
  const report = await getReport(type as ReportType, {
    page: query.export === "csv" ? 1 : query.page,
    pageSize: query.export === "csv" ? 5000 : query.pageSize,
    search: query.search || undefined,
    from: query.from ? parseDateOnly(query.from) : undefined,
    to: query.to ? endOfDateOnly(query.to) : undefined,
  });
  if (query.export === "csv") return csvResponse(`${type}.csv`, reportToCsv(report));
  return ok(report);
});
