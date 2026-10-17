import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { systemAuthService } from '../services/systemAuthService';

export type UserRole = 'owner' | 'employee' | 'support' | 'developer';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  email?: string;
  /** `preset:N` or an uploaded photo's url; unset means the default avatar. */
  avatar?: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  hasAccess: (requiredRole: UserRole[]) => boolean;
  setAvatar: (avatar: string | null) => void;
}

const roleMap: Record<string, UserRole> = {
  DEVELOPER: 'developer',
  OWNER: 'owner',
  EMPLOYEE: 'employee',
  SUPPORT: 'support',
};

/**
 * A JWT's payload. It is base64url, and the JSON inside is UTF-8: `atob` alone
 * hands back one character per byte, which turned Arabic names into
 * "Ø­Ø³Ù†"-style mojibake.
 */
const decodeJwtPayload = (token: string): Record<string, unknown> => {
  const part = token.split('.')[1];
  if (!part) throw new Error('Malformed token');
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};

/** The signed-in member from their token, or null if it can't be read. */
const userFromToken = (token: string): User | null => {
  try {
    const payload = decodeJwtPayload(token) as { id: string; email?: string; name?: string; role?: string };
    const role = roleMap[String(payload.role || '').toUpperCase()];
    if (!role) {
      console.error('Unknown user role:', payload.role);
      return null;
    }
    const name = payload.name ?? '';
    return {
      id: payload.id,
      username: payload.email?.split('@')[0] || name.toLowerCase(),
      role,
      name,
      email: payload.email,
    };
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

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
    if (!stored || !token) return null;
    const saved = JSON.parse(stored) as User;
    // Re-read the token: names saved before the UTF-8 fix are mojibake.
    const fromToken = userFromToken(token);
    return fromToken ? { ...fromToken, avatar: saved.avatar ?? null } : saved;
  });

  const remember = useCallback((next: User | null) => {
    setUser(next);
    if (next) localStorage.setItem('user', JSON.stringify(next));
  }, []);

  // The token only carries what was true at sign-in; the avatar (and any
  // rename) comes from the server.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    systemAuthService
      .me()
      .then((me) => {
        if (cancelled || !me) return;
        setUser((current) => {
          if (!current || current.id !== userId) return current;
          const next = { ...current, name: me.fullName || current.name, avatar: me.avatar ?? null };
          localStorage.setItem('user', JSON.stringify(next));
          return next;
        });
      })
      .catch(() => {
        // Keep what the token says; the avatar falls back to the default.
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const login = async (email: string, password: string): Promise<User | null> => {
    try {
      const response = await systemAuthService.login({
        email: email.trim(),
        password,
      });

      if (!response.token) return null;

      const userData = userFromToken(response.token);
      if (!userData) return null;

      remember(userData);
      localStorage.setItem('token', response.token);
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
      return userData;
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

  const setAvatar = useCallback(
    (avatar: string | null) => {
      if (user) remember({ ...user, avatar });
    },
    [user, remember],
  );

  return (
    <AuthContext.Provider value={{ user, login, logout, hasAccess, setAvatar }}>
      {children}
    </AuthContext.Provider>
  );
};
