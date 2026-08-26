# Motorcycle Repair Shop Business Software

A full-stack business management system for a motorcycle repair shop: customers,
motorcycles, appointments, work orders (repair tickets), a labor/service catalog,
parts inventory, invoicing, and payments — with a role-based staff login and a
dashboard for day-to-day shop operations.

## Stack

- **Backend:** Node.js, Express, TypeScript, Prisma ORM, SQLite (dev) — swap to
  PostgreSQL for production by changing the `datasource` provider in
  `server/prisma/schema.prisma` and `DATABASE_URL`.
- **Frontend:** React + Vite + TypeScript, React Router, TanStack Query, plain CSS.
- **Auth:** JWT bearer tokens, bcrypt-hashed passwords, role-based access
  (`ADMIN`, `MANAGER`, `TECHNICIAN`, `FRONTDESK`). The first account created
  becomes `ADMIN` automatically.

## Features

- **Customers** — contact info, notes, linked motorcycles and work order history.
- **Motorcycles** — make/model/year/VIN/plate/mileage per customer.
- **Appointments** — scheduling with status tracking (scheduled/confirmed/completed/no-show).
- **Work orders (repair tickets)** — status workflow (pending → in progress →
  waiting on parts → completed → invoiced), priority, technician assignment,
  complaint/diagnosis notes, itemized labor and parts lines.
- **Service catalog** — reusable labor items with a default rate and estimated hours.
- **Parts inventory** — SKU, stock levels, reorder thresholds, unit cost/price;
  stock automatically decrements when a part is added to a work order (and is
  restored if the line is removed), with a low-stock view.
- **Invoicing & payments** — generate an invoice from a work order's labor +
  parts lines with tax, record partial/full payments, void invoices.
- **Dashboard** — open/in-progress/waiting-on-parts/completed-today counts,
  outstanding balance, revenue this month, low-stock parts, upcoming appointments.

## Project layout

```
server/   Express + Prisma API   (see server/README below via package.json scripts)
client/   React + Vite frontend
```

## Getting started

### 1. Backend API

```bash
cd server
cp .env.example .env      # adjust JWT_SECRET etc. if you like
npm install
npm run prisma:migrate    # creates dev.db and applies the schema
npm run seed               # optional: demo admin/technician/customer/parts
npm run dev                 # http://localhost:4000
```

Seeded demo login (if you ran `npm run seed`): `admin@motoshop.test` / `admin123`.
If you skip seeding, register the first account from the login screen — it is
automatically granted the `ADMIN` role.

### 2. Frontend

```bash
cd client
npm install
npm run dev   # http://localhost:5173, proxies /api to the backend on :4000
```

Open http://localhost:5173 and sign in (or register the first account).

## API overview

All routes except `/api/auth/register` and `/api/auth/login` require an
`Authorization: Bearer <token>` header.

| Resource | Routes |
| --- | --- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Customers | `GET/POST /api/customers`, `GET/PUT/DELETE /api/customers/:id` |
| Motorcycles | `GET/POST /api/motorcycles`, `GET/PUT/DELETE /api/motorcycles/:id` |
| Appointments | `GET/POST /api/appointments`, `PUT/DELETE /api/appointments/:id` |
| Work orders | `GET/POST /api/work-orders`, `GET/PUT/DELETE /api/work-orders/:id`, plus nested `POST/DELETE /api/work-orders/:id/services[/:lineId]` and `/parts[/:lineId]` |
| Service catalog | `GET/POST /api/services`, `PUT/DELETE /api/services/:id` |
| Parts inventory | `GET/POST /api/parts`, `PUT/DELETE /api/parts/:id`, `POST /api/parts/:id/adjust-stock` |
| Invoices | `GET /api/invoices`, `GET /api/invoices/:id`, `POST /api/invoices/generate`, `POST /api/invoices/:id/payments`, `POST /api/invoices/:id/void` |
| Dashboard | `GET /api/dashboard/summary` |
| Users/staff | `GET /api/users`, `PUT /api/users/:id` (admin/manager only) |

## Data model

See `server/prisma/schema.prisma` for the full schema: `User`, `Customer`,
`Motorcycle`, `Appointment`, `Service`, `Part`, `WorkOrder`,
`WorkOrderService`, `WorkOrderPart`, `Invoice`, `Payment`.

## Notes on moving to production

- Switch `server/prisma/schema.prisma`'s datasource to `postgresql` and point
  `DATABASE_URL` at a real Postgres instance, then re-run migrations.
- Set a strong, random `JWT_SECRET`.
- Restrict `CORS_ORIGIN` to your deployed frontend's origin.
- Put the Express app behind HTTPS (a reverse proxy like Nginx, or your host's
  built-in TLS termination).
