import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, FolderKanban, DollarSign,
  FileText, Truck, Wallet, Shield, LogOut, ChevronRight,
  Building2, Settings, Users, HardHat, Calendar, Building
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
}

const Layout = () => {
  const { user, logout, switchTenant } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const tenants = user?.tenants || [];
  const currentTenant = tenants.find(t => t.tenantId === user?.tenantId);

  const isOwner = user?.role === 'OWNER';
  const isManager = user?.role === 'MANAGER' || isOwner;

  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Projects', path: '/projects', icon: FolderKanban },
    { label: 'Schedule', path: '/schedule', icon: Calendar, roles: ['OWNER', 'MANAGER'] },
    { label: 'Employees', path: '/employees', icon: HardHat, roles: ['OWNER', 'MANAGER'] },
    { label: 'Office Payroll', path: '/accounting/office-payroll', icon: FileText, roles: ['OWNER', 'MANAGER'] },
    { label: 'Fixed Assets', path: '/accounting/fixed-assets', icon: Truck, roles: ['OWNER', 'MANAGER'] },
    { label: 'Payouts', path: '/accounting/payouts', icon: Wallet, roles: ['OWNER', 'MANAGER'] },
    { label: 'Audit Log', path: '/audit-logs', icon: Shield, roles: ['OWNER'] },
    { label: 'Team', path: '/team', icon: Users, roles: ['OWNER'] },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter(item => !item.roles || item.roles.includes(user?.role || ''));

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-sidebar text-sidebar-foreground transition-all duration-200 flex flex-col border-r`}>
        {/* Brand */}
        <div className="flex items-center justify-between px-4 py-4">
          {sidebarOpen && (
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Building2 className="h-4 w-4" />
              </div>
              <span className="font-bold text-sm">exaMath</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
          </Button>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          <div className="space-y-1 px-2">
            {filteredNav.map(item => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        <Separator className="bg-sidebar-border" />

        {/* User */}
        <div className="p-3">
            <DropdownMenu>
            <DropdownMenuTrigger>
              <div className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-sidebar-accent">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                    {user?.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                {sidebarOpen && (
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="truncate text-sm font-medium">{user?.name}</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">{user?.role}</span>
                  </div>
                )}
                {sidebarOpen && <ChevronRight className="ml-auto h-4 w-4 text-sidebar-foreground/60" />}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              {tenants.length > 1 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                    <Building className="h-3 w-3" />
                    <span>Organization</span>
                  </DropdownMenuLabel>
                  {tenants.map(tenant => (
                    <DropdownMenuItem
                      key={tenant.tenantId}
                      onClick={() => switchTenant(tenant.tenantId)}
                      className="flex flex-col items-start"
                    >
                      <span className="text-sm">{tenant.tenantName}</span>
                      <span className="text-xs text-muted-foreground">
                        {tenant.role} · {tenant.tenantSlug}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
