import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSidebar } from '@/components/ui/sidebar';
import { SupportUnreadProvider } from '@/contexts/SupportUnreadContext';
import { cn } from '@/lib/utils';

const DashboardLayout = () => {
  const { openMobile, setOpenMobile } = useSidebar();

  return (
    <SupportUnreadProvider>
      <div className="flex min-h-svh w-full overflow-x-hidden bg-[#f8fafc]">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-100 bg-[#f8fafc]/95 px-3 py-2.5 backdrop-blur md:hidden">
            <BurgerButton
              open={openMobile}
              onClick={() => setOpenMobile(!openMobile)}
            />
            <button
              type="button"
              onClick={() => setOpenMobile(true)}
              className="flex items-center gap-2"
              aria-label="mel.iq"
            >
              <span className="text-sm font-bold text-[#04111c]" dir="ltr">mel.iq</span>
              <span
                className="relative size-8 overflow-hidden rounded-full shadow-[0_0_16px_rgba(125,38,247,0.25)]"
                style={{ backgroundImage: 'linear-gradient(234deg, rgb(182, 87, 255) 24%, rgb(0, 191, 255) 76%)' }}
              >
                <img src="/sidebar/logo-a.svg" alt="" className="absolute inset-[24%] size-[52%]" />
              </span>
            </button>
          </header>

          {/* Desktop sidebar toggle stays inside Sidebar header */}
          <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col p-3 text-right sm:p-4 lg:p-6" dir="rtl">
            <Outlet />
          </div>
        </main>
      </div>
    </SupportUnreadProvider>
  );
};

const BurgerButton = ({ open, onClick }: { open: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
    aria-expanded={open}
    className={cn(
      'relative grid h-11 w-11 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-slate-100 transition',
      open && 'bg-violet-600 ring-violet-500'
    )}
  >
    <span className="relative block h-3.5 w-5">
      <span
        className={cn(
          'absolute right-0 left-0 h-0.5 rounded-full transition-all duration-200',
          open ? 'top-1.5 rotate-45 bg-white' : 'top-0 bg-slate-700'
        )}
      />
      <span
        className={cn(
          'absolute right-0 left-0 top-1.5 h-0.5 rounded-full transition-all duration-200',
          open ? 'scale-0 opacity-0 bg-white' : 'bg-slate-700 opacity-100'
        )}
      />
      <span
        className={cn(
          'absolute right-0 left-0 h-0.5 rounded-full transition-all duration-200',
          open ? 'top-1.5 -rotate-45 bg-white' : 'top-3 bg-slate-700'
        )}
      />
    </span>
  </button>
);

export default DashboardLayout;
