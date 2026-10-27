# Workshop ledger

Inventory, customer invoices, payments, and reports for a small aluminum and glass shop.

Shop-stock invoice lines reduce inventory when the invoice is issued. Lines purchased from an outside supplier are billed to the customer and never change stock, even when they refer to a catalog product. Drafts do not change stock or receivables. Voiding an issued invoice restores only the stock that was deducted, and only after recorded payments have been refunded.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- Prisma 6 and Neon PostgreSQL
- Database-backed sessions with Argon2id passwords
- TanStack Query and Table, React Hook Form, Zod, Axios

There is no public registration, Google sign-in, or JWT authentication.

## Requirements

- Node.js 22
- A Neon PostgreSQL database

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in the values. Do not commit `.env`.

`DATABASE_URL` is the pooled Neon connection (hostname contains `-pooler`). `DIRECT_URL` is the direct connection with that suffix removed. Prisma uses the pooled URL for the app and the direct URL for migrations. Use `sslmode=require`.

3. Create the schema and the owner account:

```bash
npx prisma migrate dev
npm run db:seed
```

The seed reads `SEED_OWNER_NAME`, `SEED_OWNER_EMAIL`, and `SEED_OWNER_PASSWORD`, hashes the password, and creates default categories and business settings. It does not create sample sales. Running it again does not reset an existing owner password.

4. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000` and sign in with the owner account.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Integration tests use `DATABASE_URL`. They create their own rows and delete them afterward. They do not reset the database. Use a separate database before the shop has real records if you want tests isolated from business data.

## Sessions

Login verifies the password, stores a random session secret in an HTTP-only cookie, and stores only the SHA-256 hash of that secret. Each protected request hashes the cookie and loads a session that is unexpired, unrevoked, and owned by an active user. Logout marks the session revoked and clears the cookie. A copied secret stops working after logout.

Login attempts are limited. Mutating API requests must come from this site and include the `X-Shop-Request` header sent by the app.

## Inventory units

Quantities use square feet, square meters, running feet, meters, pieces, sheets, or kilograms. A product keeps one unit. For area units, width, height, a dimension unit, and a piece count can calculate the billed quantity on the server. Sheet and piece lines keep the entered count. Dimensions on a sheet do not become a fraction of a sheet.

Every stock change writes a ledger row and updates the product quantity in one database transaction. The current quantity cannot be edited directly.

## Invoices, numbers, and payments

Invoice numbers are assigned when an invoice is issued, from a locked yearly counter and the prefix in settings, for example `INV-2026-0001`. Issuing the same invoice again does not deduct stock again.

Each line has an explicit source:

- Shop stock requires an active product in the same unit and enough combined quantity. Issuing writes one outgoing movement per stock line.
- An outside purchase can name a catalog product or a custom item. It can store a supplier, reference, and unit cost. It changes no product quantity.

Totals, tax, and balances are calculated on the server with decimal arithmetic. Tax is off until enabled in settings. The default currency is PKR.

Payments are separate records. A partial payment leaves the invoice partially paid. A payment that would exceed the balance is rejected. Draft and void invoices cannot take payments. Voiding requires a reason and is rejected while a net payment remains; record a refund first. Voiding restores stock once for shop-stock lines only.

Issued invoice lines keep the name, unit, quantity, and rate from the time they were issued.

## Printing and WhatsApp

The print page reads the saved invoice and business settings. Use the browser print dialog to save a PDF. WhatsApp opens a message to the customer’s phone with the invoice summary. It does not publish a public invoice link.

## Deployment

Set the same environment variables in the host. Run `npx prisma migrate deploy` and `npm run db:seed` against the production database before serving traffic. Serve the app with `npm run build` and `npm start`, or the host’s Node adapter. Keep `NODE_ENV=production` so the session cookie is marked Secure. Do not expose `.env`, password hashes, or session secrets.

This application is an operational ledger for the shop. It is not a full accounting, tax-filing, or profit system. Outside-purchase margin on the report is an estimate from the recorded unit cost.
