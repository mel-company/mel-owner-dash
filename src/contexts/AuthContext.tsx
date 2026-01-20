import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type UserRole = 'owner' | 'employee' | 'support';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
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
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (username: string, password: string): Promise<boolean> => {
    // محاكاة تسجيل الدخول - في التطبيق الحقيقي سيكون لديك API call
    // هنا نستخدم بيانات تجريبية
    const mockUsers: { [key: string]: { password: string; user: User } } = {
      'owner': { 
        password: 'owner123', 
        user: { id: '1', username: 'owner', role: 'owner', name: 'المالك' } 
      },
      'employee': { 
        password: 'emp123', 
        user: { id: '2', username: 'employee', role: 'employee', name: 'موظف' } 
      },
      'support': { 
        password: 'support123', 
        user: { id: '3', username: 'support', role: 'support', name: 'دعم فني' } 
      },
    };

    const userData = mockUsers[username.toLowerCase()];
    if (userData && userData.password === password) {
      setUser(userData.user);
      localStorage.setItem('user', JSON.stringify(userData.user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
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
