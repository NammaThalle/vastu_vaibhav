# Vastu Vaibhav 🏠📊

Vastu Vaibhav is a specialized Financial Ledger and Platform designed for Vastu Consultants. It streamlines client management, site visit logging, and financial tracking, providing a professional platform for managing energy audit portfolios.

## 🚀 Features

- **Client Management**: Manage detailed client profiles, contact information, and project locations.
- **Visit Tracking**: Log site visits with specific observations and energy audit data.
- **Financial Ledger**: Professional double-entry style ledger for tracking service charges and payments.
- **Automated Invoicing**: Professional React-based invoice template with customizable central configuration (`config/app-settings.json`).
- **Dashboard Analytics**: Real-time overview of total clients, visits, and outstanding balances.
- **Automated Backups**: Scheduled SQLite database backups powered by APScheduler to ensure data safety.
- **Comprehensive Logging**: Detailed, human-readable logging system across both frontend and backend for easy auditing and debugging.
- **Modern UI/UX**: Port-folio style interface with support for both Dark and Light modes.
- **Secure Authentication**: JWT-based authentication for data protection.

## 🛠️ Tech Stack

- **Backend**: FastAPI (Python 3.10), SQLAlchemy (Async), SQLite, Alembic (Migrations).
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons.
- **Infrastructure**: Docker & Docker Compose.
- **PDF Generation**: Puppeteer (Node.js) & React.

## 📦 Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.10+ (for local development)
- Node.js 18+ (for local development)

### Running with Docker (Local Development)
1. Clone the repository.
2. Run the following command:
   ```bash
   docker-compose up --build
   ```
3. Access the application at `http://localhost:8000`.

### Production Deployment (Client Server)

For deploying to a production server, use the template provided in the `deploy/` directory.

1. **Setup Directory Structure**: Create a dedicated folder on your server and copy `deploy/docker-compose.yml` into it.
2. **Environment Configuration**: Create a `.env` file in the same directory. This is **CRITICAL** for security. Use the following template:
   ```bash
   SECRET_KEY=your_very_secure_random_string
   DATABASE_URL=sqlite+aiosqlite:///../data/vastu.db
   ```
3. **Configuration & Data**: Create `data/` and `config/` directories next to your `docker-compose.yml`. Place your `app-settings.json` in the `config/` folder.
4. **Deploy**:
   ```bash
   docker-compose up -d
   ```
The application will pull the latest pre-built image from GHCR. Monitoring for updates can be handled via Watchtower if configured.

### Local Development (Backend)
1. Navigate to `/backend`.
2. Install dependencies: `pip install -r requirements.txt`.
3. Start the server: `uvicorn app.main:app --reload`.

### Local Development (Frontend)
1. Navigate to `/frontend`.
2. Install dependencies: `npm install`.
3. Start the development server: `npm run dev`.

## 📚 Documentation & History

For deep technical details and project evolution, please refer to our internal documentation:

*   [**Technical Architecture**](./docs/ARCHITECTURE.md): Full engineering blueprint, database schema, and security specifications.
*   [**Development Progression Log**](./docs/DEVELOPMENT_LOG.md): Detailed breakdown of the 11 logical phases of construction.

### Summary of Development Phases:
1. **Foundation**: Docker orchestration and initial infrastructure.
2. **Backend Core**: Secure API scaffolding, SQLite, and Auth.
3. **Frontend Core**: Next.js architecture and UI scaffolding.
4. **Client System**: Comprehensive client and visit life-cycle management.
5. **Ledger**: Advanced financial tracking and running balance logic.
6. **Legacy Invoicing**: Initial HTML-to-PDF utility.
7. **Design System**: Shadcn, Dark mode, and UI overhaul.
8. **Catalog**: Service pricing models and architecture specifications.
9. **Service Engine**: Dynamic calculation logic and addons.
10. **Modern Invoicing**: React + Puppeteer headless PDF rendering.
11. **Platform Stability**: APScheduler backups, clean logging, and centralized configuration.

## ⚖️ License
MIT License.
