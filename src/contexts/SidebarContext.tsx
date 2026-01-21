import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  isMobile: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
};

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpen');
      return saved ? JSON.parse(saved) : window.innerWidth >= 1024;
    }
    return true;
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsOpen(false);
      } else {
        const saved = localStorage.getItem('sidebarOpen');
        if (saved) {
          setIsOpen(JSON.parse(saved));
        }
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebarOpen', JSON.stringify(isOpen));
    }
  }, [isOpen, isMobile]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen, toggleSidebar, isMobile }}>
      {children}
    </SidebarContext.Provider>
  );
};
