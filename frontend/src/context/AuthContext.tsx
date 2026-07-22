import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../utils/api';

interface TenantInfo {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedProjectIds?: string[];
  tenantId?: string;
  tenantRole?: string;
  tenants?: TenantInfo[];
}

interface AuthContextType {
  user: User | null;
  updateUser: (updated: User) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchTenant: (tenantId: string) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get<User>('/auth/me')
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    if (data.user?.tenantId) {
      localStorage.setItem('tenantId', data.user.tenantId);
    }
    if (data.user?.tenants) {
      localStorage.setItem('userTenants', JSON.stringify(data.user.tenants));
    }
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tenantId');
    localStorage.removeItem('userTenants');
    setUser(null);
  };

  const switchTenant = (tenantId: string) => {
    localStorage.setItem('tenantId', tenantId);
    window.location.reload();
  };

  const updateUser = (updated: User) => {
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, updateUser, login, logout, switchTenant, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
