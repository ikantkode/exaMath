# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Schedule session comments — add, edit, and view system-only comments on schedule sessions (excluded from XML exports)
- Multi-tenant architecture with `Tenant` and `TenantUser` models for data isolation
- Platform admin system with `isPlatformAdmin` flag on User model
- Platform admin routes (`/api/platform`) — tenant CRUD, member management, stats
- Platform admin pages — Dashboard, Tenant List, Tenant Members, Create Tenant
- Role-based sidebar navigation — platform admins see only Platform Dashboard + Tenants; regular users see tenant nav
- Tenant switching via user dropdown in sidebar
- Schedule management — upload Primavera P6 / MS Project XML files (MSPDI, PMXML, P6PRO formats)
- Schedule parsing — extract tasks with dates, durations, percentages, predecessors, successors, critical path
- Schedule version tracking — each upload creates a new version with task snapshots
- Schedule chat — ask questions about your schedule, associate responses with specific tasks
- Project-scoped schedule routes — `/projects/:projectId/schedule` and `/projects/:projectId/schedule/upload`
- Schedule quick link card on project detail page
- `ScheduleSession`, `ScheduleTask`, `ScheduleChat`, `ScheduleVersion` database models
- Schedule store (`scheduleStore.ts`) for state management
- Subcontractor management — agreements with lock/unlock, change orders, file uploads
- Recurring expenses — office rental, utilities tracking with frequency and amount
- PKR currency support with USD conversion for expenses, payouts, and payroll
- EmploymentPeriod and PaymentLog models for employee payment history
- Employee fields — role, status, dependents, per-diem flag
- Office Rental category for fixed assets
- `assignedProjectIds` on User model for crew access control

### Changed
- All routes now tenant-scoped — queries filter by `tenantId` from JWT payload
- SOV routes nested under project detail page (`/projects/:projectId/sov`)
- Schedule routes nested under project detail (`/projects/:projectId/schedule`)
- Backend port remapped to 7303 in Docker Compose and Nginx config
- Vite proxy target fixed to use Docker service name `backend:3001`
- Prisma migrate deploy moved to runtime entrypoint for production
- Dockerfile.prod updated to run `prisma migrate deploy` before starting server
- Employee model simplified — removed salary/bonus/deductions/taxes, moved to EmploymentPeriod/PaymentLog
- Salary requirement enforced for non-per-diem employees
- Nginx listen port updated to 8080 for Dokploy container
- Comprehensive null guards across frontend and backend
- `parsedTasks` null-safe normalization in backend routes and frontend store

### Fixed
- Migration compatibility for existing enum tables (DO ... EXCEPTION pattern)
- Add columns to existing tables instead of creating them in migrations
- TypeScript implicit any errors across routes
- Select `onValueChange` null safety (`string | null` → `string`)
- Salary enforcement in frontend and backend for non-per-diem employees
- Dashboard route reference to dropped `officePayroll` model
- Enum type casing for `EmployeeStatus`, `PaymentMethod`, `PaymentType`
- Reverse relation for `RecurringExpense` in `Project` model
- Unused imports and variables cleaned up
- AlertDialog null crash on schedule version restore
- Vite proxy errors for `/api` and `/uploads` paths
- CORS configuration
- Healthcheck target using correct database name
- Duplicate `PaymentMethod`/`PaymentType` enum definitions
- `setup-status` endpoint unreachable after rebuild
- Vite cache directory configuration to prevent stale deps

---

## [0.1.0] — Initial Production Release

### Added
- Auth setup flow — first user auto-becomes OWNER
- JWT-based authentication with role system (OWNER, MANAGER, MANAGER, CREW)
- Project CRUD with wage type selection (Union, Prevailing, Private)
- Budget categories per project
- Expense tracking with currency support (USD, PKR) and conversion
- Timesheet entry and tracking
- Schedule of Values (SOV) with CSI codes, inline editing, status workflow (DRAFT → SUBMITTED → LOCKED)
- Excel export for SOV
- Office employee management (W2/1099, compensation tracking)
- Office payroll records with wages, benefits, taxes, deductions
- Field worker management with project assignments and payroll
- Fixed asset tracking with depreciation
- Payout recording for contractors
- Audit logs for accountability
- Team management with auto-generated passwords
- User settings (profile update, password change)
- Dashboard with financial charts and KPIs
- Nginx reverse proxy configuration
- Docker Compose deployment (db, backend, frontend)
- Production Dockerfile with Prisma migration
- `init-db.ts` for automatic database creation on startup
