import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSidebar } from '@/components/ui/sidebar';
import { SupportUnreadProvider } from '@/contexts/SupportUnreadContext';

const DashboardLayout = () => {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SupportUnreadProvider>
      <div className="flex min-h-svh w-full bg-[#f8fafc]">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          {isMobile && (
            <div className="flex justify-end p-3 md:hidden">
              <button
                type="button"
                onClick={() => setOpenMobile(true)}
                className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-slate-100"
                aria-label="فتح القائمة"
              >
                <img src="/sidebar/toggle-closed.svg" alt="" className="h-5 w-5 -rotate-90" />
              </button>
            </div>
          )}
          <div className="flex flex-1 flex-col p-4 text-right lg:p-6" dir="rtl">
            <Outlet />
          </div>
        </main>
      </div>
    </SupportUnreadProvider>
  );
};

export default DashboardLayout;
