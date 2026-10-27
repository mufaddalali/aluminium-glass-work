import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiError } from "@/server/errors/api-error";
import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/auth/password";
import { getSessionFromToken, loginWithPassword, revokeSessionToken } from "@/server/auth/session";
import { createCustomer } from "@/server/services/customer.service";
import { createProduct, getProduct, receiveStock, removeStock } from "@/server/services/inventory.service";
import { createInvoice, getInvoice, issueInvoice, recordInvoicePayment, voidInvoice } from "@/server/services/invoice.service";
import { ensureSettings } from "@/server/services/settings.service";

const created = {
  users: [] as string[],
  emails: [] as string[],
  products: [] as string[],
  customers: [] as string[],
  invoices: [] as string[],
};

async function makeUser(active = true) {
  const email = `tester-${crypto.randomUUID()}@example.com`;
  const password = "a-secure-test-password";
  const user = await prisma.user.create({
    data: { name: "Tester", email, passwordHash: await hashPassword(password), role: "OWNER", isActive: active },
  });
  created.users.push(user.id);
  created.emails.push(email);
  return { user, email, password };
}

async function makeCustomer() {
  const customer = await createCustomer({ name: "Test customer", phone: "03001234567" });
  created.customers.push(customer.id);
  return customer;
}

describe("shop transactions", () => {
  beforeAll(async () => {
    await removeTestRows();
  });

  afterAll(async () => {
    await removeTestRows();
    await prisma.$disconnect();
  });

  it("logs in, rejects bad or inactive credentials, and revokes a session", async () => {
    const account = await makeUser();
    const success = await loginWithPassword({ email: account.email, password: account.password, ip: "127.0.0.1", userAgent: "test" });
    const session = await getSessionFromToken(success.token);
    expect(session?.user.email).toBe(account.email);
    await expect(loginWithPassword({ email: account.email, password: "wrong-password", ip: "10.0.0.8", userAgent: null })).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    const inactive = await makeUser(false);
    await expect(loginWithPassword({ email: inactive.email, password: inactive.password, ip: "10.0.0.9", userAgent: null })).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(await getSessionFromToken(undefined)).toBeNull();
    await revokeSessionToken(success.token);
    expect(await getSessionFromToken(success.token)).toBeNull();
  });

  it("keeps stock and the ledger consistent", async () => {
    const account = await makeUser();
    const product = await createProduct({
      name: "Clear glass",
      defaultSellingPrice: "100",
      quantity: "10",
    }, account.user.id);
    created.products.push(product.id);
    expect(product.stockQuantity).toBe("10.000");
    await receiveStock({ productId: product.id, quantity: "5", occurredAt: new Date("2026-10-01T00:00:00.000Z"), reason: "Delivery", movementType: "RECEIPT" }, account.user.id);
    expect((await getProduct(product.id)).stockQuantity).toBe("15.000");
    await expect(removeStock({ productId: product.id, quantity: "100", occurredAt: new Date("2026-10-02T00:00:00.000Z"), reason: "Too much", movementType: "MANUAL_REMOVE" }, account.user.id)).rejects.toBeInstanceOf(ApiError);
    expect((await getProduct(product.id)).stockQuantity).toBe("15.000");
    const before = await prisma.stockMovement.count({ where: { productId: product.id } });
    await removeStock({ productId: product.id, quantity: "2", occurredAt: new Date("2026-10-02T00:00:00.000Z"), reason: "Damaged", movementType: "MANUAL_REMOVE" }, account.user.id);
    expect((await getProduct(product.id)).stockQuantity).toBe("13.000");
    expect(await prisma.stockMovement.count({ where: { productId: product.id } })).toBe(before + 1);
  });

  it("enforces stock and outside-purchase invoice rules", async () => {
    await ensureSettings();
    const account = await makeUser();
    const customer = await makeCustomer();
    const stocked = await createProduct({ name: "Glass A", defaultSellingPrice: "100", quantity: "10" }, account.user.id);
    const outside = await createProduct({ name: "Glass B", defaultSellingPrice: "80", quantity: "500" }, account.user.id);
    created.products.push(stocked.id, outside.id);

    const draft = await createInvoice({
      customerId: customer.id,
      invoiceDate: new Date("2026-10-10T00:00:00.000Z"),
      discountAmount: "0",
      lines: [line(stocked.id, "Glass A", "STOCK", "2", "100")],
    }, account.user.id);
    created.invoices.push(draft.id);
    expect((await getProduct(stocked.id)).stockQuantity).toBe("10.000");

    const issued = await issueInvoice(draft.id, account.user.id);
    expect(issued.status).toBe("ISSUED");
    expect((await getProduct(stocked.id)).stockQuantity).toBe("8.000");
    const issuedAgain = await issueInvoice(draft.id, account.user.id);
    expect(issuedAgain.invoiceNumber).toBe(issued.invoiceNumber);
    expect((await getProduct(stocked.id)).stockQuantity).toBe("8.000");
    expect(await prisma.stockMovement.count({ where: { productId: stocked.id, movementType: "INVOICE_ISSUED" } })).toBe(1);

    const external = await createInvoice({
      customerId: customer.id,
      invoiceDate: new Date("2026-10-11T00:00:00.000Z"),
      lines: [{ ...line(outside.id, "Glass B", "OUTSIDE_PURCHASE", "40", "90"), supplierName: "City Glass", purchaseCost: "50" }],
    }, account.user.id);
    created.invoices.push(external.id);
    await issueInvoice(external.id, account.user.id);
    expect((await getProduct(outside.id)).stockQuantity).toBe("500.000");
    expect(await prisma.stockMovement.count({ where: { productId: outside.id, movementType: "INVOICE_ISSUED" } })).toBe(0);

    const mixed = await createInvoice({
      customerId: customer.id,
      invoiceDate: new Date("2026-10-12T00:00:00.000Z"),
      lines: [line(stocked.id, "Glass A", "STOCK", "1", "100"), { ...line(outside.id, "Special", "OUTSIDE_PURCHASE", "1", "250"), supplierName: "Supplier" }],
    }, account.user.id);
    created.invoices.push(mixed.id);
    await issueInvoice(mixed.id, account.user.id);
    expect((await getProduct(stocked.id)).stockQuantity).toBe("7.000");
    expect((await getProduct(outside.id)).stockQuantity).toBe("500.000");

    const short = await createInvoice({
      customerId: customer.id,
      invoiceDate: new Date("2026-10-13T00:00:00.000Z"),
      lines: [line(stocked.id, "Glass A", "STOCK", "20", "100")],
    }, account.user.id);
    created.invoices.push(short.id);
    await expect(issueInvoice(short.id, account.user.id)).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
    expect((await getInvoice(short.id)).status).toBe("DRAFT");
    expect((await getProduct(stocked.id)).stockQuantity).toBe("7.000");

    const priced = await createInvoice({
      customerId: customer.id,
      invoiceDate: new Date("2026-10-14T00:00:00.000Z"),
      lines: [line(stocked.id, "Glass A snapshot", "STOCK", "1", "100")],
    }, account.user.id);
    created.invoices.push(priced.id);
    const pricedIssued = await issueInvoice(priced.id, account.user.id);
    await prisma.product.update({ where: { id: stocked.id }, data: { defaultSellingPrice: "250.00", name: "Renamed glass" } });
    const reread = await getInvoice(pricedIssued.id);
    expect(reread.lines[0]?.unitPrice).toBe("100.00");
    expect(reread.lines[0]?.itemName).toBe("Glass A snapshot");

    const voided = await voidInvoice(pricedIssued.id, "Customer cancelled", account.user.id);
    expect(voided.status).toBe("VOID");
    const afterVoid = (await getProduct(stocked.id)).stockQuantity;
    const voidedAgain = await voidInvoice(pricedIssued.id, "Customer cancelled", account.user.id);
    expect(voidedAgain.status).toBe("VOID");
    expect((await getProduct(stocked.id)).stockQuantity).toBe(afterVoid);
    expect((await getProduct(outside.id)).stockQuantity).toBe("500.000");

    await expect(recordInvoicePayment({ invoiceId: short.id, kind: "PAYMENT", amount: "10", paymentMethod: "CASH", paymentDate: new Date("2026-10-15T00:00:00.000Z") }, account.user.id)).rejects.toMatchObject({ code: "PAYMENT_NOT_ALLOWED" });
    await expect(recordInvoicePayment({ invoiceId: pricedIssued.id, kind: "PAYMENT", amount: "10", paymentMethod: "CASH", paymentDate: new Date("2026-10-15T00:00:00.000Z") }, account.user.id)).rejects.toMatchObject({ code: "PAYMENT_NOT_ALLOWED" });

    const bill = await createInvoice({
      customerId: customer.id,
      invoiceDate: new Date("2026-10-16T00:00:00.000Z"),
      lines: [{ ...line(null, "Labour", "OUTSIDE_PURCHASE", "1", "50000") }],
    }, account.user.id);
    created.invoices.push(bill.id);
    await issueInvoice(bill.id, account.user.id);
    const partial = await recordInvoicePayment({ invoiceId: bill.id, kind: "PAYMENT", amount: "20000", paymentMethod: "CASH", paymentDate: new Date("2026-10-16T00:00:00.000Z") }, account.user.id);
    expect(partial.invoice.status).toBe("PARTIALLY_PAID");
    expect(partial.invoice.outstanding).toBe("30000.00");
    const full = await recordInvoicePayment({ invoiceId: bill.id, kind: "PAYMENT", amount: "30000", paymentMethod: "BANK_TRANSFER", paymentDate: new Date("2026-10-17T00:00:00.000Z") }, account.user.id);
    expect(full.invoice.status).toBe("PAID");
    expect(full.invoice.outstanding).toBe("0.00");
    await expect(recordInvoicePayment({ invoiceId: bill.id, kind: "PAYMENT", amount: "1", paymentMethod: "CASH", paymentDate: new Date("2026-10-18T00:00:00.000Z") }, account.user.id)).rejects.toMatchObject({ code: "OVERPAYMENT" });
  });
});

function line(productId: string | null, name: string, sourceType: "STOCK" | "OUTSIDE_PURCHASE", quantity: string, unitPrice: string) {
  return {
    productId,
    itemName: name,
    sourceType,
    quantity,
    unit: "SQ_FT" as const,
    unitPrice,
    discountAmount: "0",
  };
}

async function removeTestRows() {
  const users = await prisma.user.findMany({
    where: { OR: [{ id: { in: created.users.length ? created.users : ["__none__"] } }, { email: { startsWith: "tester-" } }] },
    select: { id: true, email: true },
  });
  const userIds = users.map((user) => user.id);
  if (userIds.length === 0 && created.customers.length === 0) return;
  const invoices = userIds.length
    ? await prisma.invoice.findMany({ where: { createdById: { in: userIds } }, select: { id: true, customerId: true } })
    : [];
  const invoiceIds = [...new Set([...created.invoices, ...invoices.map((invoice) => invoice.id)])];
  const customerIds = [...new Set([...created.customers, ...invoices.map((invoice) => invoice.customerId)])];
  const movements = userIds.length
    ? await prisma.stockMovement.findMany({ where: { createdById: { in: userIds } }, select: { productId: true } })
    : [];
  const productIds = [...new Set([...created.products, ...movements.map((movement) => movement.productId)])];
  if (invoiceIds.length || userIds.length) {
    await prisma.payment.deleteMany({
      where: { OR: [...(invoiceIds.length ? [{ invoiceId: { in: invoiceIds } }] : []), ...(userIds.length ? [{ receivedById: { in: userIds } }] : [])] },
    });
  }
  if (invoiceIds.length) await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
  if (productIds.length || userIds.length) {
    await prisma.stockMovement.deleteMany({
      where: { OR: [...(productIds.length ? [{ productId: { in: productIds } }] : []), ...(userIds.length ? [{ createdById: { in: userIds } }] : [])] },
    });
  }
  if (productIds.length) await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  if (customerIds.length) await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
  const emails = [...new Set([...created.emails, ...users.map((user) => user.email)])];
  if (emails.length) await prisma.loginAttempt.deleteMany({ where: { emailKey: { in: emails } } });
  if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
