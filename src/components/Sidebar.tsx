import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SidebarProvider, useSidebar as useShadcnSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

type AppMenuItem = {
  path: string;
  label: string;
  icon: string;
  roles: Array<'owner' | 'employee' | 'support' | 'developer'>;
  section: 'system' | 'user';
  badge?: string;
  flipIcon?: boolean;
};

/** Tabs: ادارة النظام + ادوات المستخدم (Figma) */
const menuItems: AppMenuItem[] = [
  { path: '/dashboard', label: 'لوحة التحكم', icon: '/sidebar/icon-dashboard.svg', roles: ['owner', 'employee', 'support'], section: 'system', badge: '+1' },
  { path: '/dashboard/employees', label: 'ادارة الموظفين', icon: '/sidebar/icon-employees.svg', roles: ['owner'], section: 'system' },
  { path: '/dashboard/accounting', label: 'الحسابات المالية', icon: '/sidebar/icon-accounting.svg', roles: ['owner', 'employee'], section: 'system', flipIcon: true },
  { path: '/dashboard/payments', label: 'بوابات الدفع', icon: '/sidebar/icon-payments.svg', roles: ['owner'], section: 'system' },
  { path: '/dashboard/stores', label: 'أدارة المتجر', icon: '/sidebar/icon-stores.svg', roles: ['owner', 'employee'], section: 'user' },
  { path: '/dashboard/delivery', label: 'شركات الشحن', icon: '/sidebar/icon-delivery.svg', roles: ['owner'], section: 'user' },
  { path: '/dashboard/plans', label: 'باقات الاشتراك', icon: '/sidebar/icon-plans.svg', roles: ['owner'], section: 'user' },
];

const AppSidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, toggleSidebar, isMobile, setOpenMobile, openMobile } = useShadcnSidebar();

  const collapsed = !isMobile && state === 'collapsed';
  const mobileOpen = isMobile && openMobile;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const items = menuItems.filter((item) =>
    item.roles.includes(user?.role as 'owner' | 'employee' | 'support' | 'developer')
  );
  const systemItems = items.filter((i) => i.section === 'system');
  const userItems = items.filter((i) => i.section === 'user');

  const roleLabel = ({
    owner: 'مدير النظام',
    employee: 'موظف',
    support: 'دعم فني',
    developer: 'مطور النظام',
  } as Record<string, string>)[user?.role || 'owner'] || 'مدير النظام';

  const initials = user?.name?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'MA';

  const isActive = (path: string) =>
    path === '/dashboard' ? location.pathname === path : location.pathname.startsWith(path);

  const onNav = () => {
    if (isMobile) setOpenMobile(false);
  };

  const renderNavItem = (item: AppMenuItem) => {
    const active = isActive(item.path);
    const badge = item.badge;

    if (collapsed) {
      return (
        <Link
          key={item.path}
          to={item.path}
          onClick={onNav}
          title={item.label}
          className={cn(
            'relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[18px] transition',
            active && 'bg-[#7d26f7]'
          )}
        >
          {active && (
            <>
              <img src="/sidebar/glow-a.svg" alt="" className="pointer-events-none absolute -bottom-4 right-[-20px] size-[120px] max-w-none" />
              <img src="/sidebar/glow-b.svg" alt="" className="pointer-events-none absolute -right-6 -top-2 size-[120px] max-w-none" />
            </>
          )}
          <span className="relative size-6">
            <img
              src={item.icon}
              alt=""
              width={24}
              height={24}
              className={cn('absolute inset-0 size-full', item.flipIcon && '-scale-x-100 rotate-180', active && 'brightness-0 invert')}
            />
          </span>
          {badge && (
            <span className="absolute left-1/2 top-[38px] z-10 flex h-4 min-w-[26px] -translate-x-1/2 items-center justify-center rounded-full bg-[#ff0808] px-1.5 text-[12px] font-bold leading-none text-white shadow-[0_0_12.5px_rgba(255,8,8,0.25)]">
              {badge}
            </span>
          )}
        </Link>
      );
    }

    // RTL: أيقونة + نص يمين، الشارة يسار
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onNav}
        className={cn(
          'relative flex h-12 w-full shrink-0 items-center justify-between overflow-hidden rounded-[14px] px-3.5 py-3 transition',
          active ? 'bg-[#7d26f7]' : 'hover:bg-slate-50'
        )}
      >
        {active && (
          <>
            <img src="/sidebar/glow-a.svg" alt="" className="pointer-events-none absolute -bottom-[17px] right-[141px] size-[245px] max-w-none" />
            <img src="/sidebar/glow-b.svg" alt="" className="pointer-events-none absolute -right-10 -top-1.5 size-[245px] max-w-none" />
          </>
        )}

        <span className="relative z-10 flex items-center gap-2.5">
          <span className="relative size-6 shrink-0">
            <img
              src={item.icon}
              alt=""
              width={24}
              height={24}
              className={cn('absolute inset-0 size-full', item.flipIcon && '-scale-x-100 rotate-180', active && 'brightness-0 invert')}
            />
          </span>
          <span
            className={cn(
              'whitespace-nowrap text-right text-[16px] leading-[18px]',
              active ? 'font-bold text-white' : 'font-normal text-[#3b4656]'
            )}
          >
            {item.label}
          </span>
        </span>

        {badge ? (
          <span className="relative z-10 flex h-4 items-center justify-center rounded-full bg-[#ff0808] px-1.5 text-[12px] font-bold leading-none text-white shadow-[0_0_12.5px_rgba(255,8,8,0.25)]">
            {badge}
          </span>
        ) : (
          <span className="w-0" aria-hidden />
        )}
      </Link>
    );
  };

  const panel = (
    <aside
      className={cn(
        'flex h-full flex-col items-center overflow-hidden bg-white p-4',
        collapsed ? 'w-[92px]' : 'w-[277px]'
      )}
    >
      <div className={cn('flex min-h-0 w-full flex-1 flex-col gap-[18px]', !collapsed && 'w-[239px]')}>
        <div className="flex min-h-0 flex-1 flex-col gap-9">
          {/* RTL: الشعار يمين، زر الطي يسار */}
          <div
            className={cn(
              'flex shrink-0 overflow-hidden rounded-[20px] bg-linear-to-r from-[#f4f9fd] to-[#ebf6ff]',
              collapsed ? 'flex-col items-center gap-6 px-3 py-2' : 'items-center justify-between px-3 py-2'
            )}
          >
            <Link to="/dashboard" onClick={onNav} className="flex items-center gap-2.5" aria-label="mel.iq">
              <BrandLogo />
              {!collapsed && (
                <div className="flex flex-col items-end gap-0.5 text-right">
                  <p className="text-sm font-bold leading-none text-[#04111c]" dir="ltr">mel.iq</p>
                  <p className="text-xs font-light text-[#6c809d]">نظام إدارة المتاجر</p>
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={() => (isMobile ? setOpenMobile(false) : toggleSidebar())}
              className="relative size-8 shrink-0 overflow-hidden rounded-lg"
              aria-label={collapsed ? 'فتح القائمة' : 'إغلاق القائمة'}
            >
              <span className="absolute inset-[22%_-50%_20%_16%] flex items-center justify-center">
                <img
                  src={collapsed ? '/sidebar/toggle-closed.svg' : '/sidebar/toggle.svg'}
                  alt=""
                  className="-rotate-90 size-full max-w-none"
                />
              </span>
            </button>
          </div>

          {/* Nav sections */}
          <div className="flex min-h-0 flex-1 flex-col gap-9 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {systemItems.length > 0 && (
              <div className={cn('flex flex-col gap-2', collapsed ? 'items-center px-1.5' : 'items-end px-1.5')}>
                {!collapsed && (
                  <p className="w-full px-1 text-right text-sm font-normal leading-[18px] text-[#6c809d]">ادارة النظام</p>
                )}
                <nav className={cn('flex w-full flex-col gap-3', collapsed && 'items-center')}>
                  {systemItems.map(renderNavItem)}
                </nav>
              </div>
            )}

            {userItems.length > 0 && (
              <div className={cn('flex flex-col gap-2', collapsed ? 'items-center px-1.5' : 'items-end px-1.5')}>
                {!collapsed && (
                  <div className="flex w-full items-center gap-4 px-1">
                    <p className="shrink-0 text-right text-sm font-normal leading-[18px] text-[#6c809d]">ادوات المستخدم</p>
                    <img src="/sidebar/divider.svg" alt="" className="h-px min-w-0 flex-1" />
                  </div>
                )}
                <nav className={cn('flex flex-col gap-3', collapsed ? 'w-12 items-center' : 'w-full')}>
                  {userItems.map(renderNavItem)}
                </nav>
              </div>
            )}
          </div>
        </div>

        {/* User card */}
        <button
          type="button"
          onDoubleClick={handleLogout}
          title="انقر مرتين لتسجيل الخروج"
          className={cn(
            'flex shrink-0 items-center justify-center px-3 py-2',
            collapsed ? 'w-[60px] rounded-[22px]' : 'w-full rounded-[22px]'
          )}
          style={{ backgroundImage: 'linear-gradient(199deg, rgb(182, 87, 255) 24%, rgb(0, 191, 255) 76%)' }}
        >
          {collapsed ? (
            <UserThumb initials={initials} />
          ) : (
            <div className="flex w-full flex-1 items-center justify-between gap-[7px]">
              <UserThumb initials={initials} />
              <div className="flex min-w-0 flex-1 items-center justify-between">
                <div className="flex flex-col items-end gap-0.5 text-right text-xs text-white">
                  <p className="font-bold">{user?.name || 'محمد علي يوسف'}</p>
                  <p className="font-normal">{roleLabel}</p>
                </div>
                <img src="/sidebar/chevron.svg" alt="" width={19} height={19} className="-scale-y-100" />
              </div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div
        className={cn('hidden shrink-0 transition-[width] duration-200 md:block', collapsed ? 'w-[92px]' : 'w-[277px]')}
        aria-hidden
      />

      <div className="fixed inset-y-0 right-0 z-30 hidden h-svh md:block">{panel}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="إغلاق" onClick={() => setOpenMobile(false)} />
          <div className="absolute inset-y-0 right-0 shadow-2xl">{panel}</div>
        </div>
      )}
    </>
  );
};

const BrandLogo = () => (
  <span
    className="relative size-[42px] shrink-0 overflow-hidden rounded-full shadow-[0_0_25px_rgba(125,38,247,0.25)]"
    style={{ backgroundImage: 'linear-gradient(234deg, rgb(182, 87, 255) 24%, rgb(0, 191, 255) 76%)' }}
  >
    <span className="absolute inset-[23.8%_23.7%]">
      <img src="/sidebar/logo-a.svg" alt="" className="absolute inset-0 size-full" />
    </span>
    <span className="absolute inset-[45.7%_36.9%_36.9%_40.5%]">
      <img src="/sidebar/logo-c.svg" alt="" className="absolute inset-0 size-full" />
    </span>
  </span>
);

const UserThumb = ({ initials }: { initials: string }) => (
  <span className="relative size-11 shrink-0 overflow-hidden">
    <img src="/sidebar/avatar-ring.svg" alt="" className="absolute inset-[3%]" />
    <img src="/sidebar/avatar-inner.svg" alt="" className="absolute inset-[18%_19%]" />
    <span className="absolute inset-0 grid place-items-center text-xs font-black text-white">{initials}</span>
  </span>
);

export default AppSidebar;
export { SidebarProvider };
