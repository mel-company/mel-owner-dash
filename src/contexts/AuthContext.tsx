import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { systemAuthService } from '../services/systemAuthService';

export type UserRole = 'owner' | 'employee' | 'support' | 'developer';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  hasAccess: (requiredRole: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {    // eslint-disable-line react-refresh/only-export-components
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (stored && token) {
      return JSON.parse(stored);
    }
    return null;
  });

  const login = async (email: string, password: string): Promise<User | null> => {
    try {
      const response = await systemAuthService.login({
        email: email.trim(),
        password,
      });

      if (!response.token) return null;

      const tokenParts = response.token.split('.');
      if (tokenParts.length !== 3) return null;

      try {
        const payload = JSON.parse(atob(tokenParts[1])) as {
          id: string;
          email: string;
          name: string;
          role: string;
          phone?: string;
        };

        const roleMap: Record<string, UserRole> = {
          DEVELOPER: 'developer',
          OWNER: 'owner',
          EMPLOYEE: 'employee',
          SUPPORT: 'support',
        };

        const mappedRole = roleMap[String(payload.role || '').toUpperCase()];
        if (!mappedRole) {
          console.error('Unknown user role:', payload.role);
          return null;
        }

        const userData: User = {
          id: payload.id,
          username: payload.email?.split('@')[0] || payload.name.toLowerCase(),
          role: mappedRole,
          name: payload.name,
          email: payload.email,
        };

        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', response.token);
        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken);
        }
        return userData;
      } catch (decodeError) {
        console.error('Error decoding token:', decodeError);
        return null;
      }
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await systemAuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  };

  const hasAccess = (requiredRoles: UserRole[]): boolean => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
};
