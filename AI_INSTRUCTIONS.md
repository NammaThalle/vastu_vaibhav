# Vastu Vaibhav - Project Instructions & Context (AI_INSTRUCTIONS.md)

## 1. Project Overview
**Name**: Vastu Vaibhav (Vastu Consultant Ledger Application)
**Goal**: A mobile-first Progressive Web App (PWA) for a Vastu consultant to manage clients, visits, service entries, payments, running ledger balances, and bill generation.
**Deployment**: Initially self-hosted on a home server, future-ready for cloud migration.

## 2. Technical Stack
### Frontend
-   **Framework**: Next.js (TypeScript)
-   **Building**: Must support `output: 'export'` (Static HTML/CSS/JS) to be served by the Backend in production.
-   **Styling**: Use Standard CSS Modules or Vanilla CSS (Avoid Tailwind unless explicitly requested).
-   **State Management**: React Query (server state), Context API (auth), LocalStorage (token persistence).
-   **Features**: PWA enabled, Service Worker for offline caching of static assets.

### Backend
-   **Framework**: FastAPI (Python)
-   **Database**: **SQLite** (File-based, allows single-container deployment).
-   **ORM**: SQLAlchemy (Async)
-   **Authentication**: JWT (Access/Refresh tokens), TOTP 2FA.
-   **PDF Generation**: WeasyPrint or similar (HTML to PDF).

### Infrastructure
-   **Containerization**: Docker & Docker Compose.
-   **Proxy**: Nginx or Caddy (Reverse Proxy with rate limiting).
-   **Security**: HTTPs (Let's Encrypt), Fail2Ban.

## 3. Core Business Logic (Ledger-Based)
**Crucial**: This system is **Ledger-Based**, NOT Invoice-Based.
-   **Total Services** = Sum of all service entries across all visits.
-   **Total Paid** = Sum of all payment entries.
-   **Balance** = Total Services - Total Paid.
-   **Bill Generation**: Creates a snapshot PDF of the current state. It does NOT lock entries. Entries remain editable.
-   **Negative Balance**: Client has an advance credit.
-   **Positive Balance**: Client owes money.

## 4. Coding Guidelines
-   **Python (Backend)**:
    -   Use Type Hints everywhere.
    -   Use Pydantic models for data validation and schemas.
    -   Follow PEP 8 style.
    -   Async/Await for all I/O operations.
-   **TypeScript (Frontend)**:
    -   Use strict type checking.
    -   Functional components with Hooks.
    -   Mobile-first responsive design is mandatory.
-   **General**:
    -   Write clean, self-documenting code.
    -   Handling errors gracefully (user-friendly error messages).
    -   Security first (validate all inputs, sanitize outputs).

## 5. Directory Structure
```
/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/          # Routers
│   │   ├── core/         # Config, Security
│   │   ├── db/           # Database connection
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic models
│   │   └── services/     # Business logic
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/              # Next.js App Router
│   ├── components/
│   ├── public/
│   ├── styles/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── AI_INSTRUCTIONS.md    # This file
└── Technical Architecture v1.md
```

## 6. Key Features to Remember
-   **2FA**: Mandatory for user login (consultant).
-   **PDF Naming**: `VASTU_<ClientNameNoSpaces>_<YYYYMMDD>_<HHMM>.pdf`
-   **Data Integerity**: Foreign keys must be strict. Deleting a client is allowed only if they are archived (soft delete preferred or restricted).

## 7. AI Persona & Behavior
-   **Act as**: Senior Full-Stack Engineer.
-   **Focus**: Reliability, Security, and aesthetically pleasing "Premium" UI.
-   **Questioning**: If requirements are ambiguous, ask clarifying questions before assuming.
