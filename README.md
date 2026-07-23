# exaMath

A full-stack multi-tenant construction accounting platform. Manage projects, track expenses, handle timesheets, maintain schedules of values, and run payroll for office and field staff — all from one dashboard.

## Features

- **Dashboard** — High-level financial overview with charts and KPI cards
- **Multi-Tenancy** — Isolated tenant data with tenant switching per user
- **Platform Admin** — Super-admin dashboard for managing tenants and users
- **Projects** — Create and manage construction projects with wage type selection (Union, Prevailing, Private)
- **Budget Categories** — Define and organize project budgets
- **Expenses** — Log and categorize project expenses with currency conversion
- **Timesheets** — Track labor hours per project
- **Schedule of Values** — Inline-editable SOV with CSI codes, status workflow (Draft → Submitted → Locked), and Excel export
- **Schedule Management** — Upload and parse Primavera/MS Project XML files, chat with your schedule, track versions
- **Office Employees** — Manage office staff with compensation type (W2 / 1099), salary, bonuses, deductions, and union tracking
- **Office Payroll** — Employee-linked payroll records with wages, benefits, taxes, deductions, and paid/unpaid status
- **Field Workers** — Assign workers to projects, log hours, and track payroll per wage type (Union calculates wages + benefits separately; Prevailing/Private combines them)
- **Fixed Assets** — Track company equipment and depreciation
- **Payouts** — Record contractor payouts
- **Subcontractors** — Agreements, change orders, and file attachments
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
| Deployment | Dokploy (GitHub CI/CD), Docker Compose |

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

- **Dokploy** (for cloud deployment via GitHub CI/CD)
- **Docker** & **Docker Compose** (for local Docker deployment)
- **Node.js 18+** (for local development outside Docker)

---

### Option 1: Dokploy (Recommended Production)

exaMath is deployed via Dokploy using GitHub CI/CD. Each push to `main` triggers an automated build and deployment.

1. Push to the `main` branch of either `exaMath` or `exaMath-prod`
2. Dokploy detects the push, pulls the latest code, and runs `docker compose up --build`
3. The app is automatically available on the configured domain

**Dokploy configuration:**
- Source repository: `ikantkode/exaMath` or `ikantkode/exaMath-prod`
- Build method: Docker Compose
- Service ports: Frontend `7307`, Backend `3001`
- Database volume: Named Docker volume (`pgdata`) for persistence

On first deploy, the app will prompt you to create an admin account. The first account created automatically becomes the **OWNER**.

---

### Option 2: Docker Compose (Local / Standalone)

```bash
git clone https://github.com/ikantkode/exaMath.git
cd exaMath
docker compose up --build
```

- Frontend: http://localhost:7307
- Backend API: http://localhost:3001

---

### Option 3: Local Development (Non-Docker)

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

### Option 4: Standalone Production (Nginx)

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

## Multi-Tenant Architecture

exaMath supports a multi-tenant model where each tenant (company) has isolated data.

### Roles

| Role | Scope |
|------|-------|
| **Platform Admin** (`isPlatformAdmin: true`) | Full access to all tenants, can create/remove tenants and users. Sees only Platform Dashboard + Tenants in sidebar. |
| **OWNER** | Full access within their tenant (projects, payroll, team, settings) |
| **MANAGER** | Can create/update most resources, view all tenant data |
| **CREW** | View access to assigned projects only |

### Tenant Switching

Users belonging to multiple tenants can switch between them via the user dropdown in the sidebar. Each user's tenant membership is stored in the `TenantUser` join table.

---

## Schedule Management

Upload Primavera P6 or MS Project MSPDI/PMXML files to parse project schedules. Features:

- **XML parsing** — Extracts tasks with dates, durations, percentages, predecessors, successors, and critical path flags
- **Version tracking** — Each upload creates a new version with a snapshot of task state
- **Schedule chat** — Ask questions about your schedule; associate responses with specific tasks
- **Project-scoped** — Schedules are linked to projects via the project detail page ("Schedule" quick link)

### Workflow

1. Navigate to a project → click **Schedule** card
2. Upload an XML file (MSPDI, PMXML, or P6PRO format)
3. View parsed tasks, chat about the schedule, track changes across versions

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
| `/api/auth/me` | Get current user (includes tenant info) |
| `PUT /api/auth/me` | Update profile / change password |
| `/api/projects` | CRUD projects (tenant-scoped) |
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
| `/api/subcontractors` | Subcontractor agreements, change orders, file uploads |
| `/api/schedules` | Schedule session CRUD, XML upload, task parsing, chat, versions |
| `/api/recurring-expenses` | Recurring expense management |
| `/api/platform` | Platform admin endpoints |
| `GET /api/platform/stats` | Platform-wide stats (users, tenants, projects) |
| `GET /api/platform/tenants` | List tenants (paginated, searchable) |
| `POST /api/platform/tenants` | Create a new tenant |
| `POST /api/platform/tenants-with-user` | Create tenant + owner account |
| `PATCH /api/platform/tenants/:id` | Update tenant (name, isActive) |
| `DELETE /api/platform/tenants/:id` | Delete tenant and all associated data |
| `GET /api/platform/tenants/:id/members` | List tenant members |
| `POST /api/platform/tenants/:id/members` | Add member to tenant |
| `DELETE /api/platform/tenants/:id/members/:userId` | Remove member from tenant |
| `GET /api/platform/users` | List all users (platform admin view) |

## Project Structure

```
exaMath/
├── backend/
│   ├── src/
│   │   ├── init-db.ts              # Auto-creates database on startup
│   │   ├── index.ts                 # Express entry point (mounts all routes)
│   │   ├── middleware/auth.ts       # JWT authenticate + authorize
│   │   ├── utils/audit.ts           # Audit logging helper
│   │   └── routes/                  # 17 route modules
│   │       ├── auth.ts              # Auth + settings (PUT /me)
│   │       ├── projects.ts          # Project CRUD (tenant-scoped)
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
│   │       ├── dashboard.ts
│   │       ├── subcontractors.ts    # Subcontractor management
│   │       ├── schedules.ts         # Schedule sessions, XML upload, parsing, chat
│   │       ├── recurringExpenses.ts # Recurring expense management
│   │       └── platform.ts          # Platform admin operations (tenants, users)
│   ├── prisma/
│   │   ├── schema.prisma            # 22 models, 10 enums
│   │   └── client.ts                # Prisma client singleton
│   ├── .env / .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Router, AuthProvider, setup check
│   │   ├── components/
│   │   │   ├── Layout.tsx           # Sidebar with role-based nav, tenant switching
│   │   │   └── ui/                  # shadcn/ui v4 components (22 primitives)
│   │   ├── context/
│   │   │   └── AuthContext.tsx      # Auth state + updateUser + tenant switching
│   │   ├── pages/
│   │   │   ├── Login.tsx / Setup.tsx
│   │   │   ├── dashboard/Dashboard.tsx
│   │   │   ├── projects/            # ProjectList, ProjectDetail, Expenses, Timesheets
│   │   │   ├── accounting/          # OfficePayroll, FixedAssets, Payouts, Requisitions (SOV)
│   │   │   ├── employees/Employees.tsx
│   │   │   ├── fieldWorkers/FieldWorkers.tsx
│   │   │   ├── settings/Settings.tsx
│   │   │   ├── team/Team.tsx
│   │   │   ├── users/AuditLogs.tsx
│   │   │   ├── schedule/            # Schedule management (ManageSchedules, Upload, View)
│   │   │   └── platform/            # Platform admin (Dashboard, TenantList, TenantMembers, CreateTenant)
│   │   ├── store/scheduleStore.ts   # Schedule data store (Zustand)
│   │   └── utils/api.ts             # API client with Bearer token
│   └── Dockerfile
├── docker-compose.yml
├── nginx.conf
└── .env.example
```

## Database Models

- **Tenant** — Organization/company entity with slug and schema name
- **TenantUser** — Many-to-many join between User and Tenant with role
- **User** — Application users (Owner, Manager, Crew) with platform admin flag
- **Project** — Construction projects with wageType (Union/Prevailing/Private), tenant-scoped
- **BudgetCategory, Expense, Timesheet** — Project financial tracking (tenant-scoped)
- **ScheduleOfValue, SovItem, ChangeOrder** — CSI-coded SOV with status workflow
- **ScheduleSession, ScheduleTask, ScheduleChat, ScheduleVersion** — XML schedule upload, parsing, versioning, and AI chat
- **SubcontractorAgreement, SubcontractorChangeOrder, SubcontractorFile** — Subcontractor management with file uploads
- **Employee** — Office staff (name, address, phone, email, W2/1099, salary, bonus, deductions, taxes, union flag)
- **OfficePayroll** — Per-period payroll linked to Employee
- **EmploymentPeriod, PaymentLog** — Employment history and payment records
- **FieldWorker, FieldWorkerAssignment, FieldWorkerPayroll** — Field worker management with auto-calculated wages/benefits
- **FixedAsset, Payout, AuditLog** — Asset tracking, payouts, action history
- **RecurringExpense** — Recurring project expenses by frequency

## Environment Variables

### Backend (`.env` or `docker-compose.yml`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@db:5432/dbname` |
| `JWT_SECRET` | Secret key for JWT signing (change in production!) | `your_secret_key_here` |
| `PORT` | Backend server port | `3001` |

See `backend/.env.example` for a complete template.

## Deployment Architecture

```
                    ┌─────────────────┐
                    │    Dokploy      │
                    │  (CI/CD + Deploy│
                    └────────┬────────┘
                             │ GitHub push → auto-build
                             ▼
              ┌──────────────────────────────┐
              │         Docker Compose       │
              │  ┌──────────┐  ┌──────────┐  │
              │  │  Frontend│  │  Backend │  │
              │  │  (Vite)  │  │ (Express)│  │
              │  └────┬─────┘  └────┬─────┘  │
              │       │              │        │
              │       └──────┬───────┘        │
              │              ▼                │
              │       ┌──────────┐            │
              │       │ Postgres │            │
              │       │   16     │            │
              │       └──────────┘            │
              └──────────────────────────────┘
```

## Notes

- **Single SOV per project** — enforced at the API level (409 conflict if duplicate)
- **SOV workflow:** DRAFT → SUBMITTED → LOCKED (via approve). Only OWNER can approve/revert/delete
- **Platform admins** are excluded from tenant nav; they see only Platform Dashboard and Tenants
- **Auto DB initialization** — backend creates the database on startup if it doesn't exist
- **Tenant data isolation** — all tenant-scoped queries filter by `tenantId` from the JWT payload
- **No linter/formatter config** — project follows informal conventions
- **Database reset** — to wipe all data and start fresh: `docker compose down -v && docker compose up --build`

## License

MIT
