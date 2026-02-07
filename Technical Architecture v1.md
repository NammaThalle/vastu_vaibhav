# Vastu Consultant Ledger Application

## Complete Architecture & Planning Document (v1.0)

---

# 1. Executive Summary

This application is a mobile-first Progressive Web App (PWA) designed for a Vastu consultant to manage:

* Clients
* Visits
* Service entries
* Payments
* Running ledger balance
* PDF bill generation (snapshot-based)
* Secure authentication with 2FA

The system is ledger-based (not invoice-based accounting). Every time a bill is generated, it reflects the current outstanding balance and stores a historical PDF snapshot.

Initial deployment target: Home server (self-hosted).
Future-ready for migration to cloud.

---

# 2. Core Business Model

## 2.1 Financial Model (Ledger-Based)

Each client maintains a running ledger:

Total Services = Sum of all service entries across all visits
Total Paid = Sum of all payment entries
Balance = Total Services - Total Paid

Balance rules:

* Positive → Client owes money
* Zero → Fully settled
* Negative → Client has advance balance (consultant owes refund or future adjustment)

There is NO concept of per-visit invoice.
There is NO tax logic.
There is NO locking of entries.
Entries are editable.

---

# 3. Functional Requirements

## 3.1 Client Management

* Create client
* Edit client
* Archive client (cannot delete)
* View client ledger summary

Fields:

* Name
* Phone
* Email
* Personal address
* Project site address
* Built up area
* Notes
* Status (Active / Archived)

---

## 3.2 Visit Management

Visit is a grouping entity for services.

Fields:

* Client reference
* Visit date
* Notes
* Created at

Optional in future:

* Photos
* Location

---

## 3.3 Service Entries

Belongs to Visit.
Editable anytime.

Fields:

* Visit ID
* Description
* Amount
* Created at
* Updated at

---

## 3.4 Payments

Belongs to Client.
Not tied to invoice.

Fields:

* Client ID
* Amount
* Payment date
* Payment method
* Notes

---

## 3.5 Bill Generation

When user clicks "Generate Bill":

System computes:

* Total Services
* Total Paid
* Balance

PDF contains:

* Consultant details (placeholder for now)
* Client details
* Outstanding balance only
* Generation timestamp

PDF Naming Convention:

```
VASTU_<ClientNameNoSpaces>_<YYYYMMDD>_<HHMM>.pdf
```

Example:

```
VASTU_RajeshSharma_20260214_1845.pdf
```

Every generated PDF is stored and recorded in database.

---

# 4. Data Model

## 4.1 Users

* id (UUID)
* email
* password_hash
* twofa_secret
* created_at

## 4.2 Clients

* id (UUID)
* name
* phone
* email
* personal_address
* project_site_address
* built_up_area
* notes
* status (active/archived)
* created_at

## 4.3 Visits

* id (UUID)
* client_id (FK)
* visit_date
* notes
* created_at

## 4.4 ServiceEntries

* id (UUID)
* visit_id (FK)
* description
* amount
* created_at
* updated_at

## 4.5 Payments

* id (UUID)
* client_id (FK)
* amount
* payment_date
* method
* notes
* created_at

## 4.6 GeneratedBills

* id (UUID)
* client_id (FK)
* generated_at
* total_services
* total_paid
* balance
* pdf_path

---

# 5. API Contract (High-Level)

## Auth

POST /auth/login
POST /auth/refresh
POST /auth/enable-2fa
POST /auth/verify-2fa

## Clients

GET /clients
POST /clients
PUT /clients/{id}
PATCH /clients/{id}/archive
GET /clients/{id}

## Visits

GET /clients/{id}/visits
POST /visits
PUT /visits/{id}

## Service Entries

POST /visits/{id}/services
PUT /services/{id}
DELETE /services/{id}

## Payments

GET /clients/{id}/payments
POST /payments
PUT /payments/{id}

## Bill

POST /clients/{id}/generate-bill
GET /bills/{id}
GET /bills/{id}/download

---

# 6. Application Architecture

## 6.1 Frontend

* Next.js (TypeScript)
* PWA enabled
* Mobile-first UI
* Light caching

## 6.2 Backend

* FastAPI
* PostgreSQL
* JWT authentication
* TOTP 2FA

## 6.3 PDF Generation

* HTML template
* Render to PDF
* Store locally on server
* Record entry in GeneratedBills table

---

# 7. Security Architecture

## 7.1 HTTPS

* Let’s Encrypt
* Auto renewal
* Force HTTPS redirect

## 7.2 Reverse Proxy

* Nginx or Caddy
* Rate limiting on:

  * Login endpoint
  * Auth endpoints

## 7.3 Fail2Ban

* Protect against brute force

## 7.4 Password Security

* bcrypt hashing
* Strong password enforcement

## 7.5 2FA

* TOTP (Google Authenticator compatible)

## 7.6 JWT

* Short-lived access tokens
* Refresh tokens

---

# 8. Backup Strategy (Mandatory for Home Deployment)

## 8.1 Daily Backup

* Nightly pg_dump
* Compressed
* Stored locally

## 8.2 Offsite Backup

* Upload backup to Oracle Object Storage

## 8.3 Retention Policy

* Keep 30 daily backups
* Keep 6 monthly backups

---

# 9. Deployment Architecture (Home Server)

Internet
→ DDNS
→ Reverse Proxy (HTTPS)
→ FastAPI
→ PostgreSQL
→ Local Storage (PDFs)
→ Daily Backup to Oracle

---

# 10. Development Roadmap

## Phase 1

* Setup project structure
* Setup DB schema
* Basic auth

## Phase 2

* Client CRUD
* Visit management
* Service entries

## Phase 3

* Payment logging
* Ledger computation

## Phase 4

* PDF generation
* Store generated bills

## Phase 5

* 2FA
* Security hardening

## Phase 6

* Backup automation
* Deployment scripts

---

# 11. Future Enhancements

* Passkey login (WebAuthn)
* Multi-user support
* Cloud migration
* Detailed invoice formatting
* QR code for UPI
* Branding customization

---

# 12. System Status

Architecture v1.0 finalized.
Ready for implementation.
