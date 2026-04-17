import { api } from './api';

export type Role = 'admin' | 'user';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export const authApi = {
  me: () => api.get<{ user: AuthUser | null }>('/api/auth/me'),
  login: (email: string, password: string) =>
    api.post<{ user: AuthUser }>('/api/auth/login', { email, password }),
  logout: () => api.post<{ ok: true }>('/api/auth/logout'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ ok: true }>('/api/auth/change-password', { currentPassword, newPassword }),
};
