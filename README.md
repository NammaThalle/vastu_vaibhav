# Vastu Vaibhav 🏠📊

Vastu Vaibhav is a specialized CRM and Financial Ledger application designed for Vastu Consultants. It streamlines client management, site visit logging, and financial tracking, providing a professional platform for managing energy audit portfolios.

## 🚀 Features

- **Client CRM**: Manage detailed client profiles, contact information, and project locations.
- **Visit Tracking**: Log site visits with specific observations and energy audit data.
- **Financial Ledger**: Professional double-entry style ledger for tracking service charges and payments.
- **Automated Invoicing**: Generate professional PDF bills for clients with a single click.
- **Dashboard Analytics**: Real-time overview of total clients, visits, and outstanding balances.
- **Modern UI/UX**: Port-folio style interface with support for both Dark and Light modes.
- **Secure Authentication**: JWT-based authentication for data protection.

## 🛠️ Tech Stack

- **Backend**: FastAPI (Python 3.10), SQLAlchemy (Async), SQLite/PostgreSQL, Alembic (Migrations).
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons.
- **Infrastructure**: Docker & Docker Compose.
- **PDF Generation**: xhtml2pdf.

## 📦 Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.10+ (for local development)
- Node.js 18+ (for local development)

### Running with Docker
1. Clone the repository.
2. Run the following command:
   ```bash
   docker-compose up --build
   ```
3. Access the application at `http://localhost:3000`.

### Local Development (Backend)
1. Navigate to `/backend`.
2. Install dependencies: `pip install -r requirements.txt`.
3. Start the server: `uvicorn app.main:app --reload`.

### Local Development (Frontend)
1. Navigate to `/frontend`.
2. Install dependencies: `npm install`.
3. Start the development server: `npm run dev`.

## 📈 Development History
The project was developed in 7 logical phases:
1. **Infra**: Docker and environment setup.
2. **Backend Core**: FastAPI, Security, and DB scaffolding.
3. **Frontend Core**: Next.js architecture and UI theme.
4. **CRM**: Client and Visit management modules.
5. **Ledger**: Financial tracking and balance logic.
6. **Invoicing**: PDF generation and bill templates.
7. **Refinement**: UI/UX polish, Dark mode, and final verification.

## ⚖️ License
MIT License.
