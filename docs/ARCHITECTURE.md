# Architecture

This document describes how Vastu Vaibhav is put together and why. It reflects the redesign that replaced the original package-based service catalog with a model built around how the business actually bills.

## The business, in data

From the real data (about 40 clients, January to November 2026):

- A job starts with a site inspection, billed at a fixed fee (usually Rs 2,000 or Rs 2,500).
- Most revenue comes from remedies sold in 5ml or 15ml bottles, several of each, from a fixed price list. One remedy covers every place it is used: a Door Blocker on a shutter, the main door or the main gate is the same item, with the place written on the bill line.
- Placement advice (kitchen, toilet, main door, mandir) is billed per item.
- A separate visit installs the remedies, charged case by case.
- Clients pay once or twice, mostly by UPI. Discounts are occasional (BNI or BBB membership, or ad hoc).

The design follows that: a client can have several properties, and everything billable belongs to a property.

## Data model

```
Client ──< Property ──< Visit
                    ──< Charge >── CatalogItem
                    ──< Payment
User
```

| Table | Purpose |
| --- | --- |
| `clients` | A person: name, phone, how they came to us, notes. |
| `properties` | One job: a flat, house, shop, office, factory or plot. Type, address, Google Drive folder link, an optional manual close. |
| `visits` | A site visit with date, purpose and observations. Status `done`, `scheduled` (future date) or `cancelled`. |
| `catalog_items` | What we sell. A remedy is one row per bottle size (5ml or 15ml), or has no size when sold per piece (Surya Pratima, Surya Kiran); a service has no size. Current list price. |
| `charges` | A bill line: description, quantity and unit price copied at the time of sale, or a discount, plus a short note on where it goes (shutter, main door). Optionally linked to a catalog item and a visit. |
| `payments` | Money received, with method, date, reference, and a receipt number unique within the financial year. |
| `users` | Sign-in accounts. The first account is the admin; only the admin can add or block users. |

Rules the database enforces:

- Money is stored as whole rupees in integer columns.
- Foreign keys are on (`PRAGMA foreign_keys=ON` on every connection) and use `RESTRICT`, so nothing with history can be deleted by accident.
- Remedies are 5ml, 15ml or sold per piece; services have no size.
- Receipt numbers are unique per financial year (`fiscal_year`, `receipt_seq`).
- Charges and payments are never deleted. They are voided with a reason and stay visible, crossed out.

### Derived, never stored

Balance and status are computed on every request from the rows above (`app/services/ledger.py`):

- **Balance** = charges minus discounts minus payments, ignoring voided rows. A negative balance is an advance.
- **Status** of a property, in order: `closed` if closed by hand; `payment_due` if the balance is positive; `in_progress` if a visit is scheduled; `enquiry` if nothing has been billed; otherwise `closed`.
- A client's status is the most urgent status among their properties.

At this scale (tens of clients, a few hundred rows) computing in Python on each request is instant and removes any chance of stale totals.

## Backend

```
backend/
  app/
    core/        settings, password hashing and tokens, rate limiter
    db/          declarative base with naming convention, sessions
    models/      tables: the single source of truth for the schema
    schemas/     Pydantic request and response models: the API contract
    services/    ledger (balances, status), numbering (financial year, receipts)
    api/         routes only
    cli/         seed, backup, openapi, one-time legacy import
  migrations/    Alembic environment and versions
  seeds/         starting catalog (catalog.toml)
  tests/
```

- **Async SQLAlchemy** for the API; synchronous sessions for CLI commands and Alembic.
- **Naming convention** on the metadata gives every constraint and index a stable name, which lets Alembic autogenerate clean migrations on SQLite.
- **Migrations** are generated with `alembic revision --autogenerate`, reviewed, and contain schema changes only. Seed data is loaded by `python -m app.cli.seed`, which only adds missing catalog items and never overwrites prices.
- **Auth**: OAuth2 password flow, JWT in an HTTP-only cookie (also accepted as a bearer token), 30-day expiry, 5 login attempts per minute per address.

### API

All routes are under `/api/v1` and need a signed-in user, except login.

| Method and path | Purpose |
| --- | --- |
| `GET /home` | Total to collect, collected this month, who owes, upcoming visits |
| `GET, POST /clients` | List with balance and status; create a client with their first property |
| `GET, PATCH /clients/{id}` | Client with properties and summaries; edit |
| `POST /clients/{id}/properties` | Add another property |
| `POST /clients/{id}/merge` | Fold a duplicate client into another |
| `GET, PATCH /properties/{id}` | Full property with visits, charges, payments and summary; edit or close |
| `POST /properties/{id}/visits`, `PATCH /visits/{id}` | Record, schedule or edit a visit |
| `POST /properties/{id}/charges` | Add several lines at once, from the catalog or free text, including discounts |
| `PATCH /charges/{id}`, `POST /charges/{id}/void` | Edit or cancel a line |
| `POST /properties/{id}/payments` | Record a payment and assign the next receipt number |
| `PATCH /payments/{id}`, `POST /payments/{id}/void` | Edit or cancel a payment; the receipt number never changes or gets reused |
| `GET, POST /catalog`, `PATCH /catalog/{id}` | Price list; add items; change price or hide |
| `GET /users`, `PATCH /users/{id}`, `POST /register` | Admin only after the first account |

OpenAPI docs: `/api/docs`.

## Frontend

A Next.js static export: plain HTML and JavaScript served by Caddy, with no Node server in production.

- `lib/api/schema.d.ts` is generated from the backend's OpenAPI schema; `lib/api/client.ts` wraps `openapi-fetch`, so every request and response is type-checked against the real API.
- `lib/queries.ts` holds the React Query hooks. Any change invalidates all queries, since a single payment moves numbers on several screens.
- Pages: `/` (home), `/clients`, `/clients/new`, `/client?id=`, `/property?id=`, `/catalog`, `/settings`, `/login`. Detail pages use query parameters because a static export cannot generate a page per ID.
- Layout: top navigation on wide screens, bottom tab bar on phones. Forms open in dialogs with large touch targets.

## Deployment

```
Phone / MacBook ── VPN ── central Caddy (10.0.50.12, vastu.home, tls internal)
                               │  /api/*            │  everything else
                               ▼                    ▼
                     portress:8010 api      portress:8011 web
                     (FastAPI, Python)      (Caddy serving static files)
                               │
                          /data/vastu.db (SQLite)
```

`deploy/compose.yml` defines:

- `migrate`: runs `alembic upgrade head` and exits; `api` starts only if it succeeds.
- `api`: FastAPI, with a health check on `/api/health`.
- `web`: the static frontend.
- `backup` (on demand): a safe SQLite snapshot, gzipped, keeping the last four. Run weekly from the host crontab at Sunday 00:00 IST.

CI (`.github/workflows/docker-publish.yml`) runs backend tests, `alembic check`, the generated-types check, the frontend typecheck and build, then publishes both images on pushes to `main`, tagged `latest` and with the commit SHA.

## Not built yet

- PDF receipts, bills and consultation reports, and sharing them on WhatsApp.
- WhatsApp payment reminders with a UPI link.
- Quotes that turn into charges.
- Remedy stock, supplier purchases and margins.
- Financial-year reports and GST fields, ahead of registering the business.
