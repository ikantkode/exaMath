import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import './init-db';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import budgetCategoryRoutes from './routes/budgetCategories';
import expenseRoutes from './routes/expenses';
import timesheetRoutes from './routes/timesheets';

import officePayrollRoutes from './routes/officePayroll';
import fixedAssetRoutes from './routes/fixedAssets';
import payoutRoutes from './routes/payouts';
import auditLogRoutes from './routes/auditLogs';
import dashboardRoutes from './routes/dashboard';
import sovRoutes from './routes/schedulesOfValue';
import userRoutes from './routes/users';
import employeeRoutes from './routes/employees';
import fieldWorkerRoutes from './routes/fieldWorkers';
import subcontractorRoutes from './routes/subcontractors';
import scheduleRoutes from './routes/schedules';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
  process.exit(1);
}

export const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/budget-categories', budgetCategoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/timesheets', timesheetRoutes);

app.use('/api/office-payroll', officePayrollRoutes);
app.use('/api/fixed-assets', fixedAssetRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/schedules-of-value', sovRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/field-workers', fieldWorkerRoutes);
app.use('/api/subcontractors', subcontractorRoutes);
app.use('/api/schedules', scheduleRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  if (err?.message?.includes('unexpected token') || err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
