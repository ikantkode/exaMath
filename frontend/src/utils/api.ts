export const API_URL = '/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

export const api = {
  get: async <T>(url: string): Promise<T> => {
    const res = await fetch(`${API_URL}${url}`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }
    return res.json();
  },

  post: async <T>(url: string, body: any): Promise<T> => {
    const isFormData = body instanceof FormData;
    const res = await fetch(`${API_URL}${url}`, {
      method: 'POST',
      headers: { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...getAuthHeaders() },
      body: isFormData ? body : JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }
    return res.json();
  },

  put: async <T>(url: string, body: any): Promise<T> => {
    const res = await fetch(`${API_URL}${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }
    return res.json();
  },

  patch: async <T>(url: string, body?: any): Promise<T> => {
    const res = await fetch(`${API_URL}${url}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }
    return res.json();
  },

  delete: async <T>(url: string): Promise<T> => {
    const res = await fetch(`${API_URL}${url}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }
    return res.json();
  },
};

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export const formatDate = (date: string | Date) =>
  new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export const canAccess = (userRole: string, allowedRoles: string[]) => allowedRoles.includes(userRole);
