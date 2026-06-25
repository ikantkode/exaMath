# exaMath

A full-stack construction accounting application. Manage projects, track expenses, handle timesheets, and maintain schedules of values — all from one dashboard.

## Features

- **Projects** — Create and manage construction projects with client info, design/agency numbers
- **Dashboard** — High-level financial overview with charts and KPI cards
- **Budget Categories** — Define and organize project budgets
- **Expenses** — Log and categorize project expenses
- **Timesheets** — Track labor hours per project
- **Schedule of Values** — Inline-editable SOV with CSI codes, status workflow (Draft → Submitted → Locked), and Excel export
- **Office Payroll** — Manage office payroll entries
- **Fixed Assets** — Track company equipment and depreciation
- **Payouts** — Record contractor payouts
- **Audit Logs** — Track all user actions for accountability
- **Auth** — JWT-based login with Owner, Manager, and Viewer roles

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide icons |
| Backend | Express.js, TypeScript, Prisma ORM, JWT auth |
| Database | PostgreSQL 16 |
| Deployment | Docker Compose |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local dev outside Docker)

### Docker (recommended)

```bash
git clone https://github.com/ikantkode/exaMath.git
cd exaMath
docker compose up --build
```

- Frontend: http://localhost:7307
- Backend API: http://localhost:3001

On first launch, the app will prompt you to create an admin account. The first account created automatically becomes the **OWNER**.

### Local Development

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## SOV Inline Editing

Double-click any cell to edit. Navigation:
- **Enter / Tab** → moves to the next cell (CSI Code → CSI Title → Description → Value)
- After Value on the last row → auto-creates a new row and moves to CSI Code
- **Escape** → cancels the edit

Export to Excel using the Export button in the status banner.

## API Endpoints

| Prefix | Resource |
|--------|----------|
| `/api/auth/setup-status` | Check if app needs initial setup |
| `/api/auth/register` | Create a new user (first user = OWNER) |
| `/api/auth/login` | Sign in |
| `/api/auth/me` | Get current user |
| `/api/projects` | CRUD projects |
| `/api/budget-categories` | Budget line items |
| `/api/expenses` | Project expenses |
| `/api/timesheets` | Labor timesheets |
| `/api/schedules-of-value` | SOV CRUD, submit/approve/revert, items |
| `/api/office-payroll` | Office payroll entries |
| `/api/fixed-assets` | Fixed asset tracking |
| `/api/payouts` | Contractor payouts |
| `/api/audit-logs` | Action history |
| `/api/dashboard` | Financial summaries |

## Project Structure

```
exaMath/
├── backend/
│   ├── src/routes/          # Express route handlers
│   ├── src/middleware/auth.ts
│   ├── prisma/schema.prisma
│   └── Dockerfile
├── frontend/
│   ├── src/pages/           # Page components
│   ├── src/context/         # Auth context
│   ├── src/utils/api.ts     # API client
│   └── Dockerfile
├── docker-compose.yml
└── nginx.conf
```

## License

MIT
