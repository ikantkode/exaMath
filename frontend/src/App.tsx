import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './utils/api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Dashboard from './pages/dashboard/Dashboard';
import ProjectList from './pages/projects/ProjectList';
import ProjectDetail from './pages/projects/ProjectDetail';
import Expenses from './pages/projects/Expenses';
import Timesheets from './pages/projects/Timesheets';
import SchedulesOfValue from './pages/accounting/Requisitions';
import OfficePayroll from './pages/accounting/OfficePayroll';
import FixedAssets from './pages/accounting/FixedAssets';
import Payouts from './pages/accounting/Payouts';
import AuditLogs from './pages/users/AuditLogs';
import Settings from './pages/settings/Settings';
import Team from './pages/team/Team';
import Employees from './pages/employees/Employees';
import FieldWorkers from './pages/fieldWorkers/FieldWorkers';
import ScheduleView from './pages/schedule/ScheduleView';
import ScheduleUpload from './pages/schedule/ScheduleUpload';
import { Toaster } from './components/ui/toast';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles?: string[] }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return <>{children}</>;
};

// Check setup status before rendering app
const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    api.get<{ needsSetup: boolean }>('/auth/setup-status')
      .then(d => setNeedsSetup(d.needsSetup))
      .catch(() => setNeedsSetup(true));
  }, []);

  if (needsSetup === null) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (needsSetup) return <Setup />;

  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/setup" element={<Setup />} />
    <Route path="/login" element={<Login />} />
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="projects" element={<ProjectList />} />
      <Route path="projects/:id" element={<ProjectDetail />} />
      <Route path="projects/:id/expenses" element={<Expenses />} />
      <Route path="projects/:id/timesheets" element={<Timesheets />} />
      <Route path="projects/:projectId/sov" element={<SchedulesOfValue />} />
      <Route path="accounting/office-payroll" element={<OfficePayroll />} />
       <Route path="accounting/fixed-assets" element={<FixedAssets />} />
       <Route path="accounting/payouts" element={<Payouts />} />
       <Route path="employees" element={<Employees />} />
       <Route path="projects/:id/field-workers" element={<FieldWorkers />} />
       <Route
          path="audit-logs"
          element={
            <ProtectedRoute roles={['OWNER']}>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route path="settings" element={<Settings />} />
        <Route
           path="team"
           element={
             <ProtectedRoute roles={['OWNER']}>
               <Team />
             </ProtectedRoute>
           }
         />
         <Route path="schedule" element={<ScheduleView />} />
         <Route path="schedule/upload" element={<ScheduleUpload onUpload={() => {}} />} />
     </Route>
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

const App = () => (
  <AppInitializer>
    <AuthProvider>
      <AppRoutes />
      <Toaster />
    </AuthProvider>
  </AppInitializer>
);

export default App;
