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

### Private Server Deployment (Using GHCR & Watchtower)
For deploying to a private home server, this repository uses GitHub Actions to publish a Docker image to the GitHub Container Registry (GHCR), which is then automatically pulled and updated by Watchtower.

1. **Generate a GitHub PAT (Personal Access Token)** with `read:packages` permission.
2. **Authenticate Docker on your Server**:
   ```bash
   echo "YOUR_PAT_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
   ```
3. **Configure Environment variables**: Create `backend/.env` with your secure `SECRET_KEY` and `DATABASE_URL`.
4. **Deploy**:
   ```bash
   docker-compose up -d
   ```
Watchtower will automatically check for new images built by GitHub Actions every 5 minutes and update the container seamlessly.

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
