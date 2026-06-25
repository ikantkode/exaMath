import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:7307', 'http://frontend:5173', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
