export const queryKeys = {
  auth: { me: ["auth", "me"] as const },
  dashboard: { summary: ["dashboard"] as const },
  settings: { current: ["settings"] as const },
  categories: { all: ["categories"] as const },
  products: {
    all: ["products"] as const,
    lists: () => [...queryKeys.products.all, "list"] as const,
    list: (params: unknown) => [...queryKeys.products.lists(), params] as const,
    details: () => [...queryKeys.products.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
  },
  movements: {
    all: ["movements"] as const,
    lists: () => [...queryKeys.movements.all, "list"] as const,
    list: (params: unknown) => [...queryKeys.movements.lists(), params] as const,
  },
  customers: {
    all: ["customers"] as const,
    lists: () => [...queryKeys.customers.all, "list"] as const,
    list: (params: unknown) => [...queryKeys.customers.lists(), params] as const,
    details: () => [...queryKeys.customers.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
  },
  invoices: {
    all: ["invoices"] as const,
    lists: () => [...queryKeys.invoices.all, "list"] as const,
    list: (params: unknown) => [...queryKeys.invoices.lists(), params] as const,
    details: () => [...queryKeys.invoices.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.invoices.details(), id] as const,
  },
  payments: {
    all: ["payments"] as const,
    lists: () => [...queryKeys.payments.all, "list"] as const,
    list: (params: unknown) => [...queryKeys.payments.lists(), params] as const,
  },
  reports: {
    all: ["reports"] as const,
    list: (type: string, params: unknown) => [...queryKeys.reports.all, type, params] as const,
  },
};
