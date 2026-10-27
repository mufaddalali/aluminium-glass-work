import type { InventoryUnit } from "@/lib/glass";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "STAFF";
};

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type PageResult<T> = {
  items: T[];
  meta: PageMeta;
};

export type ProductDto = {
  id: string;
  name: string;
  description: string | null;
  stockQuantity: string;
  defaultSellingPrice: string;
  updatedAt: string;
};

export type MovementDto = {
  id: string;
  productId: string;
  productName: string;
  movementType: string;
  direction: "IN" | "OUT";
  quantity: string;
  unit: InventoryUnit;
  stockBefore: string | null;
  stockAfter: string | null;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  invoiceNumber: string | null;
  supplierName: string | null;
  supplierReference: string | null;
  costPrice: string | null;
  occurredAt: string;
  createdByName: string;
};

export type CustomerDto = {
  id: string;
  name: string;
  phone: string;
  alternatePhone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  totalInvoiced: string;
  totalPaid: string;
  outstanding: string;
};

export type InvoiceLineDto = {
  id: string;
  productId: string | null;
  itemName: string;
  description: string | null;
  sourceType: "STOCK" | "OUTSIDE_PURCHASE";
  quantity: string;
  unit: InventoryUnit;
  width: string | null;
  height: string | null;
  dimensionUnit: string | null;
  pieceCount: number | null;
  unitPrice: string;
  discountAmount: string;
  lineTotal: string;
  purchaseCost: string | null;
  supplierName: string | null;
  supplierReference: string | null;
  purchaseNotes: string | null;
};

export type PaymentDto = {
  id: string;
  invoiceId: string;
  invoiceNumber: string | null;
  customerName: string;
  kind: "PAYMENT" | "REFUND";
  amount: string;
  paymentMethod: string;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
  receivedByName: string;
  createdAt: string;
};

export type InvoiceDto = {
  id: string;
  invoiceNumber: string | null;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAddress: string | null;
  status: "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "VOID";
  invoiceDate: string;
  dueDate: string | null;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  amountPaid: string;
  outstanding: string;
  notes: string | null;
  terms: string | null;
  issuedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  lines: InvoiceLineDto[];
  payments: PaymentDto[];
};

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string | null;
  customerId: string;
  customerName: string;
  customerPhone: string;
  invoiceDate: string;
  dueDate: string | null;
  status: InvoiceDto["status"];
  totalAmount: string;
  amountPaid: string;
  outstanding: string;
};

export type SettingsDto = {
  businessName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  hasLogo: boolean;
  invoicePrefix: string;
  currency: string;
  taxEnabled: boolean;
  taxRate: string;
  taxLabel: string;
  defaultTerms: string | null;
  defaultNotes: string | null;
  paymentTermDays: number | null;
  timeZone: string;
};

export type ReportTable = {
  type: string;
  title: string;
  description: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string>>;
  meta: PageMeta;
};

export type DashboardDto = {
  currency: string;
  timeZone: string;
  salesThisMonth: string;
  paymentsThisMonth: string;
  outstandingReceivables: string;
  issuedInvoiceCount: number;
  outOfStockCount: number;
  pendingPayments: Array<InvoiceListItem & { overdue: boolean }>;
  recentInvoices: InvoiceListItem[];
  recentPayments: PaymentDto[];
  salesTrend: Array<{ month: string; label: string; total: string }>;
};
