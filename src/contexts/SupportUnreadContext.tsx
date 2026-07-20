import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supportMessagesService } from '../services/supportMessagesService';

type SupportUnreadContextValue = {
  unreadTotal: number;
  setUnreadTotal: (value: number) => void;
  refreshUnreadTotal: () => Promise<void>;
};

const SupportUnreadContext = createContext<SupportUnreadContextValue | null>(null);

export const SupportUnreadProvider = ({ children }: { children: ReactNode }) => {
  const [unreadTotal, setUnreadTotal] = useState(0);

  const refreshUnreadTotal = useCallback(async () => {
    try {
      const count = await supportMessagesService.getSystemUnreadCount();
      setUnreadTotal(count);
    } catch (error) {
      console.error('Error refreshing unread support count:', error);
    }
  }, []);

  useEffect(() => {
    refreshUnreadTotal();
    const timer = window.setInterval(refreshUnreadTotal, 15000);
    return () => window.clearInterval(timer);
  }, [refreshUnreadTotal]);

  const value = useMemo(
    () => ({ unreadTotal, setUnreadTotal, refreshUnreadTotal }),
    [unreadTotal, refreshUnreadTotal]
  );

  return <SupportUnreadContext.Provider value={value}>{children}</SupportUnreadContext.Provider>;
};

export const useSupportUnread = () => {
  const context = useContext(SupportUnreadContext);
  if (!context) {
    return {
      unreadTotal: 0,
      setUnreadTotal: () => undefined,
      refreshUnreadTotal: async () => undefined,
    };
  }
  return context;
};
