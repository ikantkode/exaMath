export interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'CREW';
  assignedProjectIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  clientName: string | null;
  originalContract: number;
  totalChangeOrders: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
  description: string;
  projectIdentificationIds: string[];
  wageType: 'UNION' | 'PREVAILING' | 'PRIVATE';
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  expenseType: 'LABOR' | 'MATERIAL' | 'EQUIPMENT' | 'SUBCONTRACTOR';
  date: string;
  projectId: string;
  categoryId: string | null;
  createdById: string;
}

export interface Employee {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  position: string | null;
  compensationType: 'W2' | '1099';
  salary: number;
  bonus: number;
  deductions: number;
  taxes: number;
  isUnion: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FieldWorker {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  compensationType: 'W2' | '1099';
  isUnion: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Timesheet {
  id: string;
  hours: number;
  rate: number;
  date: string;
  projectId: string;
  userId: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  budget: number;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfficePayrollEntry {
  id: string;
  employeeId: string;
  grossPay: number;
  wages: number;
  benefits: number;
  taxes: number;
  deductions: number;
  netPay: number;
  periodStart: string;
  periodEnd: string;
  paid: boolean;
}

export interface FieldWorkerAssignment {
  id: string;
  fieldWorkerId: string;
  projectId: string;
  wageRate: number;
  benefitRate: number;
  createdAt: string;
}

export interface FieldWorkerPayrollEntry {
  id: string;
  assignmentId: string;
  hoursWorked: number;
  grossWages: number;
  grossBenefits: number;
  taxes: number;
  deductions: number;
  netPay: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export interface ScheduleOfValue {
  id: string;
  projectId: string;
  name: string;
  status: 'DRAFT' | 'SUBMITTED' | 'LOCKED';
  totalValue: number;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SovItem {
  id: string;
  sovId: string;
  itemNumber: number;
  csiCode: string;
  csiCodeTitle: string;
  description: string;
  value: number;
  completedValue: number;
}

export interface ChangeOrder {
  id: string;
  projectId: string;
  description: string;
  value: number;
  status: 'DRAFT' | 'SUBMITTED' | 'LOCKED';
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
}

export interface FixedAsset {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  purchaseDate: string;
  usefulLife: number;
  accumulatedDepreciation: number;
  currentValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payout {
  id: string;
  name: string;
  amount: number;
  date: string;
  createdAt: string;
}
