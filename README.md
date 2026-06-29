# exaMath

A full-stack construction accounting application. Manage projects, track expenses, handle timesheets, maintain schedules of values, and run payroll for office and field staff — all from one dashboard.

## Features

- **Dashboard** — High-level financial overview with charts and KPI cards
- **Projects** — Create and manage construction projects with wage type selection (Union, Prevailing, Private)
- **Budget Categories** — Define and organize project budgets
- **Expenses** — Log and categorize project expenses
- **Timesheets** — Track labor hours per project
- **Schedule of Values** — Inline-editable SOV with CSI codes, status workflow (Draft → Submitted → Locked), and Excel export
- **Office Employees** — Manage office staff with compensation type (W2 / 1099), salary, bonuses, deductions, and union tracking
- **Office Payroll** — Employee-linked payroll records with wages, benefits, taxes, deductions, and paid/unpaid status
- **Field Workers** — Assign workers to projects, log hours, and track payroll per wage type (Union calculates wages + benefits separately; Prevailing/Private combines them)
- **Fixed Assets** — Track company equipment and depreciation
- **Payouts** — Record contractor payouts
- **Audit Logs** — Track all user actions for accountability
- **Team Management** — Add team members with auto-generated passwords, assign roles (Owner, Manager, Crew)
- **Settings** — Update your profile and change your password
- **Auth** — JWT-based login with Owner, Manager, and Crew roles. First user auto-becomes OWNER.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS v4, shadcn/ui v4 (@base-ui/react), Recharts, Lucide icons, xlsx |
| Backend | Express.js, TypeScript, Prisma ORM, JWT auth, bcrypt |
| Database | PostgreSQL 16 |
| Deployment | Docker Compose |

## Wage Types

Projects support three wage types:

| Type | Wage Rate | Benefit Rate | Payment |
|------|-----------|--------------|---------|
| **Union** | Required (per hour) | Required (per hour, paid end of month) | Wages paid per period, benefits paid monthly |
| **Prevailing** | Required (combined wage + benefit) | Optional (separate) | Combined payment |
| **Private** | Required (combined wage + benefit) | Optional (separate) | Combined payment |

---

## Deployment & Setup

### Prerequisites

- **Docker** & **Docker Compose** (for Docker deployment)
- **Node.js 18+** (for local development outside Docker)

---

### Option 1: Docker Compose (Recommended)

```bash
git clone https://github.com/ikantkode/exaMath.git
cd exaMath
docker compose up --build
```

- Frontend: http://localhost:7307
- Backend API: http://localhost:3001

On first launch, the app will prompt you to create an admin account. The first account created automatically becomes the **OWNER**.

---

### Option 2: Local Development (Non-Docker)

#### 1. Clone and configure environment variables

```bash
git clone https://github.com/ikantkode/exaMath.git
cd exaMath
cp backend/.env.example backend/.env
```

Edit `backend/.env` to set your credentials:

```env
DATABASE_URL="postgresql://construction:construction_pass@localhost:5434/construction_db"
JWT_SECRET="change_this_to_a_random_secret"
PORT=3001
```

#### 2. Start PostgreSQL

```bash
# Docker Compose (db only)
docker compose up db -d

# Or run PostgreSQL locally on port 5434 with a database named construction_db
```

#### 3. Backend

```bash
cd backend
npm install
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run database migrations
npm run dev            # Start dev server on port 3001
```

#### 4. Frontend

```bash
cd frontend
npm install
npm run dev            # Start dev server on port 5173
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

---

### Option 3: Standalone Production (Nginx)

Build and deploy on a single server:

```bash
# 1. Start the database
docker compose up db -d

# 2. Build the backend
cd backend
npm install
npm run db:generate
npm run db:migrate
npm run build          # Outputs to backend/dist/

# 3. Start the backend (production)
cp .env.example .env   # Configure your .env
npm start              # Runs node dist/index.js on port 3001

# 4. Build the frontend
cd ../frontend
npm install
npm run build          # Outputs to frontend/dist/

# 5. Configure and start Nginx
# Update nginx.conf with your domain, then:
cp nginx.conf /etc/nginx/conf.d/examath.conf
nginx -t && systemctl restart nginx
```

**Ports:** Frontend `7307` / Backend `3001` / Database `5434`

---

### First-Time Setup

Regardless of deployment method, on first launch:

1. Open the app in a browser
2. If no users exist, you'll see a **Setup** page
3. Enter your name, email, and password
4. The first account created automatically becomes the **OWNER** (full access)
5. Additional users can be added via **Team Management** (OWNER/Manager only)

---

## SOV Inline Editing

Double-click any cell to edit. Navigation:
- **Enter / Tab** → moves to the next cell (CSI Code → CSI Title → Description → Value)
- After Value on the last row → auto-creates a new row and moves to CSI Code
- **Escape** → cancels the edit

Export to Excel using the Export button in the status banner.

## Team Management

When adding team members, passwords are auto-generated (16 characters) and displayed once in the dialog. Share the password with the user — they should change it via Settings after first login.

## API Endpoints

| Prefix | Resource |
|--------|----------|
| `/api/auth/setup-status` | Check if app needs initial setup |
| `/api/auth/register` | Create a new user (first user = OWNER) |
| `/api/auth/login` | Sign in |
| `/api/auth/me` | Get current user |
| `PUT /api/auth/me` | Update profile / change password |
| `/api/projects` | CRUD projects |
| `/api/budget-categories` | Budget line items |
| `/api/expenses` | Project expenses |
| `/api/timesheets` | Labor timesheets |
| `/api/schedules-of-value` | SOV CRUD, submit/approve/revert, items |
| `/api/employees` | Office employee CRUD |
| `/api/office-payroll` | Office payroll entries (linked to employees) |
| `/api/field-workers/workers` | Field worker CRUD |
| `/api/field-workers/assignments` | Assign workers to projects |
| `/api/field-workers/payroll` | Field worker payroll entries |
| `/api/users` | Team user management (list, create with auto-password, update, delete) |
| `/api/fixed-assets` | Fixed asset tracking |
| `/api/payouts` | Contractor payouts |
| `/api/audit-logs` | Action history |
| `/api/dashboard` | Financial summaries |

## Project Structure

```
exaMath/
├── backend/
│   ├── src/
│   │   ├── init-db.ts              # Auto-creates database on startup
│   │   ├── index.ts                 # Express entry point
│   │   ├── middleware/auth.ts       # JWT authenticate + authorize
│   │   └── routes/                  # 15 route modules
│   │       ├── auth.ts              # Auth + settings (PUT /me)
│   │       ├── projects.ts          # Project CRUD
│   │       ├── budgetCategories.ts
│   │       ├── expenses.ts
│   │       ├── timesheets.ts
│   │       ├── schedulesOfValue.ts  # SOV + change orders
│   │       ├── employees.ts         # Office staff CRUD
│   │       ├── officePayroll.ts     # Employee-linked payroll
│   │       ├── fieldWorkers.ts      # Worker assignments + payroll
│   │       ├── users.ts             # Team management + auto-passwords
│   │       ├── fixedAssets.ts
│   │       ├── payouts.ts
│   │       ├── auditLogs.ts
│   │       └── dashboard.ts
│   ├── prisma/
│   │   ├── schema.prisma            # 20 models, 6 enums
│   │   └── client.ts                # Prisma client singleton
│   ├── .env / .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Router, AuthProvider, setup check
│   │   ├── components/
│   │   │   ├── Layout.tsx           # Sidebar with user dropdown menu
│   │   │   └── ui/                  # shadcn/ui v4 components (22 primitives)
│   │   ├── context/
│   │   │   └── AuthContext.tsx      # Auth state + updateUser
│   │   ├── pages/
│   │   │   ├── Login.tsx / Setup.tsx
│   │   │   ├── dashboard/Dashboard.tsx
│   │   │   ├── projects/            # ProjectList, ProjectDetail, Expenses, Timesheets
│   │   │   ├── accounting/          # OfficePayroll, FixedAssets, Payouts, Requisitions (SOV)
│   │   │   ├── employees/Employees.tsx
│   │   │   ├── fieldWorkers/FieldWorkers.tsx
│   │   │   ├── settings/Settings.tsx
│   │   │   ├── team/Team.tsx
│   │   │   └── users/AuditLogs.tsx
│   │   └── utils/api.ts             # API client with Bearer token
│   └── Dockerfile
├── docker-compose.yml
├── nginx.conf
└── .env.example
```

## Database Models

- **User** — Application users (Owner, Manager, Crew)
- **Project** — Construction projects with wageType (Union/Prevailing/Private)
- **BudgetCategory, Expense, Timesheet** — Project financial tracking
- **ScheduleOfValue, SovItem, ChangeOrder** — CSI-coded SOV with status workflow
- **SubcontractorAgreement, SubcontractorChangeOrder, SubcontractorFile** — Subcontractor management with file uploads
- **Employee** — Office staff (name, address, phone, email, W2/1099, salary, bonus, deductions, taxes, union flag)
- **OfficePayroll** — Per-period payroll linked to Employee
- **FieldWorker** — Field worker master record
- **FieldWorkerAssignment** — Links worker to project with wage/benefit rates
- **FieldWorkerPayroll** — Per-period payroll with auto-calculated wages/benefits
- **FixedAsset, Payout, AuditLog** — Asset tracking, payouts, action history

## Environment Variables

### Backend (`.env` or `docker-compose.yml`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@db:5432/dbname` |
| `JWT_SECRET` | Secret key for JWT signing (change in production!) | `your_secret_key_here` |
| `PORT` | Backend server port | `3001` |

See `backend/.env.example` for a complete template.

## Notes

- **Single SOV per project** — enforced at the API level (409 conflict if duplicate)
- **SOV workflow:** DRAFT → SUBMITTED → LOCKED (via approve). Only OWNER can approve/revert/delete
- **Settings** is accessible from the user dropdown at the bottom of the sidebar
- **Auto DB initialization** — backend creates the database on startup if it doesn't exist
- **No linter/formatter config** — project follows informal conventions
- **Database reset** — to wipe all data and start fresh: `docker compose down -v && docker compose up --build`

## License

MIT
