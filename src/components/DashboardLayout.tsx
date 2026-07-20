import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { SupportUnreadProvider } from '@/contexts/SupportUnreadContext';
import { cn } from '@/lib/utils';

const DashboardLayout = () => {
  const { state } = useSidebar();

  return (
    <SupportUnreadProvider>
      <SidebarInset
        className={cn(
          'transition-[margin] duration-200 ease-linear md:mr-64',
          state === 'collapsed' && 'md:mr-12'
        )}
      >
        <div className="flex flex-1 flex-col bg-[#f8fafc] p-4 text-right lg:p-6" dir="rtl">
          <Outlet />
        </div>
      </SidebarInset>
      <Sidebar />
    </SupportUnreadProvider>
  );
};

export default DashboardLayout;
