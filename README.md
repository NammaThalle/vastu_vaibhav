# Shree Vastu Vaibhav

A small business app for a Vastu consultant in Goa. It records clients and their properties, site visits and observations, remedies and services sold, discounts and payments, and shows at a glance who still owes money.

It is built for two people: the consultant, on a phone at the site or a MacBook at home, and the admin who runs the server.

## What it does

- **Home**: total still to collect, money collected this month, a "who owes" list with call and WhatsApp buttons, and upcoming visits.
- **Clients**: search, filter by "owes money" or "open", add a client together with their first property, merge a client who was added twice.
- **Property page**: one history of visits, charges and payments, with four buttons: Visit, Remedies, Discount, Payment. Remedies are added from a grid with plus and minus buttons, in 5ml or 15ml bottles or per piece, each with an optional word on where it goes (shutter, main gate) shown next to the line.
- **Documents**: numbered bills (B/2026-27/0001), receipts for every payment, quotes (Q/2026-27/0001) that turn into charges when accepted, and a consultation report with a written summary, the remedies and where each goes, and the visit observations. All are A4 PDFs, shared from the phone straight to WhatsApp or printed.
- **Reminders**: a WhatsApp button on Home and on each property that owes money, with the amount and payment details already written.
- **Catalog**: the remedy and service price list. Price changes only affect new charges; old bills keep the price they were sold at.
- **Settings**: users (admin only), theme, sign out.

Status (Enquiry, In progress, Payment due, Closed) is worked out from the data and never typed in. Charges and payments are cancelled, never deleted, so the history stays complete. Every payment gets a receipt number that restarts each financial year, for example `R/2026-27/0001`.

## Stack

- **Backend**: FastAPI, SQLAlchemy 2 (async), SQLite, Alembic, WeasyPrint for PDFs. Python 3.13.
- **Frontend**: Next.js 15 static export, React Query, Tailwind, types generated from the API's OpenAPI schema.
- **Deployment**: Docker Compose on the home server, behind the central Caddy.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design.

## Local development

Backend (PDFs need Pango: `brew install pango` on macOS):

```bash
cd backend
python3 -m venv venv && venv/bin/pip install -r requirements-dev.txt
venv/bin/alembic upgrade head
venv/bin/python -m app.cli.seed
venv/bin/uvicorn app.main:app --reload --port 8000
```

Frontend, in a second terminal. The dev server forwards `/api/*` to the backend:

```bash
cd frontend
npm ci
npm run dev
```

The first account registered becomes the admin. API docs are at `http://localhost:8000/api/docs`.

Or run both in Docker with `docker compose up` and open `http://localhost:3000`.

## Changing the database

Models in `backend/app/models/` are the only source of truth. After changing a model:

```bash
cd backend
venv/bin/alembic revision --autogenerate -m "describe the change"
```

Review the generated file in `backend/migrations/versions/`. Autogenerate cannot detect renames (it sees a drop and an add) or changes to CHECK constraints; those are the only reasons to touch a generated migration. CI runs `alembic check` and fails if models and migrations disagree.

## Changing the API

After changing a schema or route, regenerate the frontend types and commit them:

```bash
cd frontend
npm run api:types
```

CI fails if `frontend/lib/api/schema.d.ts` is out of date.

## Tests

```bash
cd backend && venv/bin/python -m pytest -q
cd frontend && npm run typecheck && npm run build
```

## Production

Images are published by CI when a version tag such as `v1.0.0` is pushed: `ghcr.io/nammathalle/vastu_vaibhav-api` and `ghcr.io/nammathalle/vastu_vaibhav-web`.

On the server, copy `deploy/compose.yml` and `deploy/.env.example` (as `.env`), plus `config/app-settings.json`, into the deploy folder, then:

```bash
docker compose pull && docker compose up -d
```

Business details on the documents (name, phones, bank, UPI ID for the payment QR code) come from `config/app-settings.json`, which is not in git; `config/app-settings.example.json` lists every field. To use a different logo, put the image in the config folder and set `invoice.logoFile`.

The `migrate` service applies pending migrations before the API starts. The Caddy snippet in `deploy/caddy/vastu.caddy` routes `/api/*` to the API and everything else to the web container. Backups run weekly from the host's crontab; the line is in `deploy/compose.yml`.

## License

MIT.
