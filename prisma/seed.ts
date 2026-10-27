import "dotenv/config";
import type { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { prisma } from "../src/server/db/prisma";
import { hashPassword } from "../src/server/auth/password";
import { ensureSettings } from "../src/server/services/settings.service";

const catalog: Array<{ name: string; price: string; description: string }> = [
  { name: "Clear float glass 5mm", price: "450.00", description: "Clear float glass, 5mm." },
  { name: "Clear float glass 8mm", price: "620.00", description: "Clear float glass, 8mm." },
  { name: "Bronze tinted glass 5mm", price: "520.00", description: "Bronze tinted glass, 5mm." },
  { name: "Green tinted glass 6mm", price: "540.00", description: "Green tinted glass, 6mm." },
  { name: "Reflective blue glass 6mm", price: "780.00", description: "Reflective blue glass, 6mm." },
  { name: "Toughened glass 8mm", price: "890.00", description: "Toughened glass, 8mm." },
  { name: "Toughened glass 10mm", price: "1100.00", description: "Toughened glass, 10mm." },
  { name: "Laminated glass 6.38mm", price: "980.00", description: "Laminated glass, 6.38mm." },
  { name: "Frosted glass 5mm", price: "560.00", description: "Frosted glass, 5mm." },
  { name: "Mirror 4mm", price: "480.00", description: "Silver mirror, 4mm." },
  { name: "Mirror 6mm", price: "640.00", description: "Silver mirror, 6mm." },
  { name: "Sliding window section", price: "320.00", description: "Aluminium sliding window section." },
  { name: "Sliding door section", price: "410.00", description: "Aluminium sliding door section." },
  { name: "Casement section", price: "360.00", description: "Aluminium casement section." },
  { name: "Tube 1 x 1", price: "180.00", description: "Aluminium tube, 1 x 1." },
  { name: "Tube 2 x 1", price: "240.00", description: "Aluminium tube, 2 x 1." },
  { name: "Angle 1 inch", price: "150.00", description: "Aluminium angle, 1 inch." },
  { name: "Door handle set", price: "850.00", description: "Door handle set." },
  { name: "Sliding roller set", price: "420.00", description: "Sliding roller set." },
  { name: "Mortise lock body", price: "960.00", description: "Mortise lock body." },
  { name: "Rubber gasket", price: "45.00", description: "Rubber gasket." },
  { name: "Silicone sealant", price: "380.00", description: "Silicone sealant." },
  { name: "Aluminium composite sheet", price: "4500.00", description: "Aluminium composite sheet." },
  { name: "Fly screen mesh", price: "95.00", description: "Fly screen mesh." },
];

const customerNames = [
  "Karachi Glass House",
  "Clifton Aluminium Works",
  "Defence Glazing",
  "Saddar Mirror Centre",
  "North Nazimabad Frames",
  "Gulshan Glass Traders",
  "PECHS Window Studio",
  "Korangi Fabrication",
  "Malir Glass Point",
  "Bahadurabad Interiors",
  "Shahrah-e-Faisal Glazing",
  "Lyari Metal Works",
  "Orangi Glass Mart",
  "Site Super Highway Frames",
  "DHA Phase 6 Windows",
  "Scheme 33 Glass",
  "Nazimabad Hardware",
  "Garden East Mirrors",
  "Liaquatabad Sections",
  "Gulistan-e-Johar Glass",
  "Boat Basin Interiors",
  "Tariq Road Glazing",
  "Landhi Fabricators",
  "Surjani Glass House",
];

async function seedRecords(ownerId: string) {
  const already = await prisma.product.findFirst({ where: { name: "Clear float glass 5mm" } });
  if (already) {
    console.log("Sample records already present.");
    return;
  }

  const products: Array<Awaited<ReturnType<typeof prisma.product.create>>> = [];
  for (const item of catalog) {
    const product = await prisma.product.create({
      data: {
        name: item.name,
        description: item.description,
        stockQuantity: "50.000",
        defaultSellingPrice: item.price,
        movements: {
          create: {
            movementType: "INITIAL",
            direction: "IN",
            quantity: "50.000",
            unit: "PIECE",
            stockBefore: "0.000",
            stockAfter: "50.000",
            reason: "Opening stock of 50.",
            createdById: ownerId,
          },
        },
      },
    });
    products.push(product);
  }

  const customers: Array<Awaited<ReturnType<typeof prisma.customer.create>>> = [];
  for (let index = 0; index < customerNames.length; index += 1) {
    const serial = String(index + 1).padStart(2, "0");
    const customer = await prisma.customer.create({
      data: {
        name: customerNames[index],
        phone: `0302${String(index + 1).padStart(7, "0")}`,
        email: `accounts-${serial}@seed.local`,
        address: "Karachi",
        notes: "Seeded sample customer.",
      },
    });
    customers.push(customer);
  }

  const year = 2026;
  await prisma.$transaction(async (tx) => {
    const counter = await tx.invoiceCounter.upsert({
      where: { year },
      create: { year, lastNumber: 0 },
      update: {},
    });
    let lastNumber = counter.lastNumber;
    for (let index = 0; index < 24; index += 1) {
      lastNumber += 1;
      const product = products[index];
      const total = (2 * Number(product.defaultSellingPrice)).toFixed(2);
      const invoiceDate = new Date(Date.UTC(2026, 9, 1 + (index % 26), 6, 0, 0));
      const dueDate = new Date(invoiceDate);
      dueDate.setUTCDate(dueDate.getUTCDate() + 14);
      let status: InvoiceStatus = "ISSUED";
      let paid = "0.00";
      if (index < 12) {
        status = "PAID";
        paid = total;
      } else if (index < 20) {
        status = "PARTIALLY_PAID";
        paid = (Number(total) / 2).toFixed(2);
      }
      const methods: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "MOBILE_WALLET", "CARD"];
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: `INV-${year}-${String(lastNumber).padStart(4, "0")}`,
          customerId: customers[index].id,
          status,
          invoiceDate,
          dueDate,
          subtotal: total,
          discountAmount: "0.00",
          taxAmount: "0.00",
          totalAmount: total,
          notes: "Seeded sample invoice.",
          terms: "Payment is due by the date shown on this invoice.",
          createdById: ownerId,
          issuedAt: invoiceDate,
          lines: {
            create: {
              productId: product.id,
              itemName: product.name,
              description: "Supplied from an outside purchase. Shop stock was not used.",
              sourceType: "OUTSIDE_PURCHASE",
              quantity: "2.000",
              unit: "SQ_FT",
              unitPrice: product.defaultSellingPrice,
              discountAmount: "0.00",
              lineTotal: total,
              supplierName: "Metro Glass Traders",
              sortOrder: 0,
            },
          },
          payments: paid === "0.00" ? undefined : {
            create: {
              kind: "PAYMENT",
              amount: paid,
              paymentMethod: methods[index % methods.length],
              paymentDate: invoiceDate,
              reference: `RCPT-${String(index + 1).padStart(3, "0")}`,
              receivedById: ownerId,
              notes: "Seeded sample payment.",
            },
          },
        },
      });
      if (!invoice.invoiceNumber) throw new Error("Invoice number was not saved.");
    }
    await tx.invoiceCounter.update({ where: { year }, data: { lastNumber } });
  }, { maxWait: 15_000, timeout: 60_000 });

  console.log("Seeded 24 products at 50 on hand, 24 customers, 24 invoices, and 20 payments.");
}

async function main() {
  const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD ?? "";
  const name = process.env.SEED_OWNER_NAME?.trim() || "Shop Owner";
  if (!email || !password) {
    throw new Error("Set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD before seeding.");
  }
  if (password.length < 8) {
    throw new Error("SEED_OWNER_PASSWORD must be at least 8 characters.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  const owner = existing ?? await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "OWNER",
      isActive: true,
    },
  });

  await ensureSettings();
  await seedRecords(owner.id);
  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Seed failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
