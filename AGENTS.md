<!-- Pi: UPDATE MODE
This AGENTS.md was generated in a prior session. Your job:
1. Re-explore the project (rg --files, re-read key source files)
2. Check for new or changed .cursorrules, CLAUDE.md, or other AI config files
3. Update every section below with fresh findings — fix stale info, fill gaps
4. Preserve any human-authored notes that don't conflict with current reality
-->

# Project Agent

**Workspace Path:** `/home/shakespear/exaMath`
*(Note to Pi: Your file write/edit tools run in a different directory by default. You MUST use absolute paths starting with the Workspace Path above for ALL file operations!)*

**Generated:** 2026-06-26

## Stack

### Frontend
- **React 18** with TypeScript (`react: ^18.2.0`, `@types/react: ^18.2.43`)
- **Vite 5** as build tool/dev server (`vite: ^5.0.8`)
- **Tailwind CSS 3.4** with CSS custom properties (HSL color system)
- **shadcn/ui** (base-nova style) via Radix UI primitives — Dialog, Label, Select, Separator, Slot, Tabs
- **React Router DOM 6** for routing (`react-router-dom: ^6.21.0`)
- **Recharts 2.10** for charting (`recharts: ^2.10.0`)
- **Lucide React** for icons (`lucide-react: ^0.300.0`)
- **xlsx 0.18.5** for Excel export
- **class-variance-authority**, **clsx**, **tailwind-merge** for component variants
- **date-fns 3** for date formatting
- Path alias `@` → `./src` configured in vite.config.ts

### Backend
- **Express.js 4.18** with TypeScript
- **Prisma ORM 5.10** as database client
- **PostgreSQL 16** via Docker
- **JWT** (`jsonwebtoken: ^9.0.2`) for auth with 24h token expiry
- **bcrypt 5.1.1** for password hashing
- **multer 1.4.5** (file uploads, present in deps)
- **uuid 9** for ID generation
- **ts-node-dev** for hot-reload dev server

### Infrastructure
- **Docker Compose** (v3.8) for orchestration
- **Nginx** config available for standalone deployment (port 7307)

## Structure

```
exaMath/
├── backend/
│   ├── src/
│   │   ├── index.ts                    # Express app entry, mounts all route prefixes
│   │   ├── middleware/auth.ts          # JWT authenticate + authorize middleware
│   │   └── routes/                     # 13 route modules (Express Router each)
│   │       ├── auth.ts                 # /api/auth — setup-status, register, login, me
│   │       ├── projects.ts             # /api/projects — CRUD + role-based filtering
│   │       ├── budgetCategories.ts     # /api/budget-categories
│   │       ├── expenses.ts             # /api/expenses
│   │       ├── timesheets.ts           # /api/timesheets
│   │       ├── schedulesOfValue.ts     # /api/schedules-of-value — SOV + change orders
│   │       ├── officePayroll.ts        # /api/office-payroll
│   │       ├── fixedAssets.ts          # /api/fixed-assets
│   │       ├── payouts.ts              # /api/payouts
│   │       ├── auditLogs.ts            # /api/audit-logs
│   │       ├── dashboard.ts            # /api/dashboard — financial summaries
│   │       └── requisitions.ts         # (present, role of routes unclear vs schedulesOfValue)
│   ├── prisma/
│   │   ├── schema.prisma               # 12 models: User, Project, BudgetCategory, Expense,
│   │   │                                # Timesheet, ScheduleOfValue, SovItem, ChangeOrder,
│   │   │                                # OfficePayroll, FixedAsset, Payout, AuditLog
│   │   └── client.ts                   # Prisma client singleton
│   ├── .env / .env.example
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx                     # Router setup, AuthProvider, ProtectedRoute, setup check
│   │   ├── main.tsx                    # React entry point
│   │   ├── index.css                   # Tailwind + shadcn CSS custom properties
│   │   ├── components/
│   │   │   ├── Layout.tsx              # Sidebar layout with role-based nav, collapsible
│   │   │   └── ui/                     # shadcn/ui primitives (badge, button, card, dialog,
│   │   │                                #   input, label, select, separator, table, tabs, textarea)
│   │   ├── context/
│   │   │   └── AuthContext.tsx         # Auth state, login/logout, localStorage token
│   │   ├── pages/
│   │   │   ├── Login.tsx               # Login form
│   │   │   ├── Setup.tsx               # First-user registration (becomes OWNER)
│   │   │   ├── dashboard/Dashboard.tsx  # Financial overview with charts
│   │   │   ├── projects/               # Project management
│   │   │   │   ├── ProjectList.tsx
│   │   │   │   ├── ProjectDetail.tsx
│   │   │   │   ├── Expenses.tsx
│   │   │   │   └── Timesheets.tsx
│   │   │   ├── accounting/             # Accounting modules
│   │   │   │   ├── Requisitions.tsx    # Schedule of Values (SOV)
│   │   │   │   ├── OfficePayroll.tsx
│   │   │   │   ├── FixedAssets.tsx
│   │   │   │   └── Payouts.tsx
│   │   │   └── users/
│   │   │       └── AuditLogs.tsx       # OWNER-only audit trail
│   │   ├── utils/
│   │   │   └── api.ts                  # fetch wrapper (get/post/put/delete), Bearer token,
│   │   │                                # formatCurrency, formatDate, canAccess helpers
│   │   └── lib/
│   │       └── utils.ts                # shadcn cn() utility (clsx + twMerge)
│   ├── components.json                 # shadcn/ui config (base-nova, lucide icons)
│   ├── tailwind.config.js              # HSL color theme, custom keyframes/animations
│   ├── vite.config.ts                  # React plugin, @ alias, API proxy
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml                  # 3 services: db (postgres:16), backend, frontend
├── nginx.conf                          # Standalone Nginx config (ports 7307)
└── README.md                           # Full project documentation
```

## Commands

| Action       | Backend                          | Frontend               | Docker                |
|--------------|----------------------------------|------------------------|-----------------------|
| Install      | `npm install`                    | `npm install`          | `docker compose up --build` |
| Dev server   | `npm run dev` (ts-node-dev)      | `npm run dev`          | included above        |
| Build        | `npm run build` (tsc)            | `npm run build` (tsc + vite) | —               |
| Start (prod) | `npm start`                      | `npm run preview`      | `docker compose up`   |
| DB generate  | `npm run db:generate` (prisma)   | —                      | —                     |
| DB migrate   | `npm run db:migrate`             | —                      | —                     |
| DB seed      | `npm run db:seed` (no-op)        | —                      | —                     |

**Ports:** Frontend `7307` (Docker) / `5173` (Vite dev), Backend `3001`, DB `5434` (exposed)

## Conventions

### Backend
- **Route modules:** Each resource gets its own file under `src/routes/`. Exports an `Express.Router` instance.
- **Middleware pattern:** `authenticate` (JWT check) always applied; `authorize('OWNER', 'MANAGER', ...)` for role restrictions on write ops.
- **Audit logging:** Most write operations call a local `logAction()` helper that creates an `AuditLog` entry via Prisma.
- **Error handling:** Uniform `try/catch` with `res.status(500).json({ error: '...' })` for server errors; specific HTTP codes (400, 401, 403, 404, 409) for business logic errors.
- **No TypeScript strict mode visible** — uses `any` in some places (e.g., SOV item upsert).

### Frontend
- **API client:** Single `api` object in `utils/api.ts` with generic `get<T>`, `post<T>`, `put<T>`, `delete<T>` methods. Auto-attaches Bearer token from `localStorage`.
- **Auth:** Context-based (`AuthContext`). Token stored in localStorage. `ProtectedRoute` wrapper checks auth + roles. `AppInitializer` checks setup status before rendering.
- **Routing:** `react-router-dom` v6 with nested `<Route>` inside `<Layout />`.
- **UI components:** shadcn/ui base-nova style. Use `@/components/ui/*` imports with Vite `@` alias.
- **Styling:** Tailwind CSS utility classes throughout. HSL custom properties for theming (primary blue `221 83% 53%`).
- **File naming:** PascalCase for components (`ProjectList.tsx`), camelCase for utilities (`api.ts`).
- **No linter/formatter config** — no eslint, prettier, or biome config present.

### Database
- **Enums:** `UserRole` (OWNER, MANAGER, CREW), `ExpenseType` (LABOR, MATERIAL, EQUIPMENT, SUBCONTRACTOR), `ProjectStatus` (ACTIVE, COMPLETED, ON_HOLD), `SovStatus` (DRAFT, SUBMITTED, APPROVED, LOCKED).
- **UUIDs:** All models use `@default(uuid())`.
- **Timestamps:** `createdAt @default(now())`, `updatedAt @updatedAt` where applicable.
- **Cascade deletes:** Expenses, Timesheets, BudgetCategories, SOV items cascade on project delete.

## Key Files

| File | Purpose |
|------|---------|
| `backend/prisma/schema.prisma` | Full data model — 12 models, 4 enums, all relationships |
| `backend/src/index.ts` | Express entry point — mounts 13 route modules |
| `backend/src/middleware/auth.ts` | JWT authenticate + authorize middleware |
| `backend/src/routes/schedulesOfValue.ts` | SOV CRUD + status workflow + change orders (largest route file) |
| `frontend/src/App.tsx` | Router config, auth wrapper, setup check, protected routes |
| `frontend/src/context/AuthContext.tsx` | Auth state management, login/logout |
| `frontend/src/utils/api.ts` | HTTP client with auth header, currency/date helpers |
| `frontend/src/components/Layout.tsx` | Sidebar layout with role-based navigation |
| `docker-compose.yml` | Full stack orchestration (db → backend → frontend) |
| `frontend/tailwind.config.js` | Theme colors, animations, shadcn integration |

## What to Avoid

- **Don't add ESLint/Prettier** unless explicitly requested — project has no formatter/linter config and follows informal conventions.
- **Don't change the `@` alias resolution** — it's configured in `vite.config.ts` to point to `./src`.
- **Don't remove the `authenticate` middleware** from routes — all backend routes require JWT auth.
- **Don't change enum values** in `schema.prisma` without updating frontend logic (e.g., `UserRole`, `SovStatus`).
- **Don't break the setup flow** — `AppInitializer` in `App.tsx` checks `/auth/setup-status`; first user auto-becomes OWNER.
- **SOV workflow is strict:** DRAFT → SUBMITTED → LOCKED (via approve). Only OWNER can approve/revert/delete. Only edits on DRAFT status.
- **Single SOV per project** — enforced at the API level (409 conflict if duplicate).
- **Don't use relative imports** — the project uses `@/` aliases (Vite) and `../../` relative paths (backend). Be consistent per layer.
- **No test suite exists** — don't add tests unless explicitly requested.

## Notes

- **No AI config files found** — no `.cursorrules`, `CLAUDE.md`, `.eslintrc`, `prettier.config`, or `eslint.config` exist in the repo.
- **No seed data** — `seed.ts` is a no-op. First launch requires manual admin creation via `/setup` page.
- **The `backend/src/routes/requisitions.ts` file exists** but is not imported in `index.ts`. The SOV functionality lives in `schedulesOfValue.ts`. The frontend maps `/projects/:projectId/sov` to `Requisitions.tsx` page but API calls go to `/api/schedules-of-value`.
- **`--output` file** in root directory — appears to be an artifact, not part of the project.
- **Vite proxy:** Dev server proxies `/api` → `http://backend:3001`. In Docker, frontend uses `VITE_API_URL=http://localhost:3001` env var.
- **Role hierarchy:** OWNER (full access), MANAGER (create/update most resources, view all), CREW (view assigned projects only).
- **Change orders** are managed within the same route file as SOV (`schedulesOfValue.ts`) and share the `SovStatus` enum for their status workflow.
- **Nginx config** references a `dist` path that doesn't match the Docker setup (points to absolute path). Docker uses Vite dev server, not a built `dist`.
