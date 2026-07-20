import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import type { IconSvgElement } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  CodeIcon,
  CreditCardIcon,
  CustomerSupportIcon,
  DashboardSquare03Icon,
  DeliveryTruck01Icon,
  Invoice03Icon,
  StoreManagement01Icon,
  UserGroupIcon,
  Wallet02Icon,
} from '@hugeicons-pro/core-stroke-rounded';
import { useAuth } from '../contexts/AuthContext';
import { useSupportUnread } from '../contexts/SupportUnreadContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar as useShadcnSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
} from 'lucide-react';

type MenuIcon = IconSvgElement;

type AppMenuItem = {
  path: string;
  label: string;
  icon: MenuIcon;
  roles: Array<'owner' | 'employee' | 'support' | 'developer'>;
  section: 'system' | 'user';
  badge?: string;
  dynamicBadge?: 'support-unread';
};

const menuItems: AppMenuItem[] = [
  { path: '/dashboard', label: 'لوحة التحكم', icon: DashboardSquare03Icon, roles: ['owner', 'employee', 'support'], section: 'system' },
  { path: '/dashboard/employees', label: 'إدارة الموظفين', icon: UserGroupIcon, roles: ['owner'], section: 'system' },
  { path: '/dashboard/accounting', label: 'الحسابات المالية', icon: Invoice03Icon, roles: ['owner', 'employee'], section: 'system' },
  { path: '/dashboard/delivery', label: 'شركات الشحن', icon: DeliveryTruck01Icon, roles: ['owner'], section: 'system' },
  { path: '/dashboard/stores', label: 'إدارة المتاجر', icon: StoreManagement01Icon, roles: ['owner', 'employee'], section: 'user' },
  { path: '/dashboard/support', label: 'الدعم الفني', icon: CustomerSupportIcon, roles: ['support', 'owner'], section: 'user', dynamicBadge: 'support-unread' },
  { path: '/dashboard/payments', label: 'بوابات الدفع', icon: CreditCardIcon, roles: ['owner'], section: 'user' },
  { path: '/dashboard/plans', label: 'باقات الاشتراك', icon: Wallet02Icon, roles: ['owner'], section: 'user' },
  { path: '/developer', label: 'مطور النظام', icon: CodeIcon, roles: ['developer'], section: 'user' },
];

const sectionLabels = {
  system: 'إدارة النظام',
  user: 'أدوات المستخدم',
} as const;

const AppSidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useShadcnSidebar();
  const { unreadTotal } = useSupportUnread();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredMenuItems = menuItems.filter(item =>
    item.roles.includes(user?.role as 'owner' | 'employee' | 'support' | 'developer')
  );

  const groupedMenuItems = {
    system: filteredMenuItems.filter((item) => item.section === 'system'),
    user: filteredMenuItems.filter((item) => item.section === 'user'),
  };

  const getRoleLabel = (role: string) => {
    const roles: { [key: string]: string } = {
      'owner': 'مدير النظام',
      'employee': 'موظف',
      'support': 'دعم فني',
      'developer': 'مطور النظام'
    };
    return roles[role] || role;
  };

  const isCollapsed = state === 'collapsed';

  const getItemBadge = (item: AppMenuItem) => {
    if (item.dynamicBadge === 'support-unread' && unreadTotal > 0) {
      return unreadTotal > 99 ? '99+' : String(unreadTotal);
    }
    return item.badge;
  };

  return (
    <Sidebar
      side="right"
      collapsible="icon"
      variant="sidebar"
      className="border-l border-slate-100 bg-white  [--sidebar:#ffffff] shadow-[0_20px_70px_rgba(15,23,42,0.06)]"
    >
      <SidebarHeader className={cn("bg-white px-3 py-3", isCollapsed && "px-2")}>
        <div className={cn(
          isCollapsed ? "flex flex-col items-center gap-3" : "flex h-16 items-center justify-between rounded-2xl border border-slate-100 bg-white px-3 shadow-sm"
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-2 text-slate-400">
              <button
                onClick={toggleSidebar}
                className="grid h-8 w-8 place-items-center rounded-xl transition hover:bg-violet-50 hover:text-[#7D26F7]"
                aria-label="إغلاق القائمة"
              >
                <SidebarToggleIcon className="h-5 w-5" />
              </button>
              <span className="h-6 w-px rounded-full bg-slate-200" />
            </div>
          )}

          {!isCollapsed && (
            <Link to="/dashboard" className="flex min-w-0 flex-1 items-center justify-end gap-3">
              <div className="min-w-0 text-right">
                <p className="text-lg font-black leading-6 text-slate-950" dir="ltr">mel.iq</p>
                <p className="text-xs font-bold leading-5 text-slate-400">نظام إدارة المتاجر</p>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-50 text-[#7D26F7]">
                <HugeiconsIcon icon={StoreManagement01Icon} size={24} strokeWidth={2.2} />
              </span>
            </Link>
          )}

          {isCollapsed && (
            <>
              <Link
                to="/dashboard"
                className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-[#7D26F7]"
                aria-label="mel.iq"
              >
                <HugeiconsIcon icon={StoreManagement01Icon} size={24} strokeWidth={2.2} />
              </Link>
              <button
                onClick={toggleSidebar}
                className="grid h-10 w-10 place-items-center rounded-xl transition hover:scale-105"
                aria-label="فتح القائمة"
              >
                <SidebarToggleIcon />
              </button>
            </>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className={cn("bg-white px-4 py-4", isCollapsed && "px-2")}>
        {(Object.keys(groupedMenuItems) as Array<keyof typeof groupedMenuItems>).map((section) => (
          <div key={section} className="mb-8 last:mb-0">
            {!isCollapsed && groupedMenuItems[section].length > 0 && (
              <p className="mb-4 px-3 text-sm font-black text-slate-400">{sectionLabels[section]}</p>
            )}
            <SidebarMenu className={cn("gap-4", isCollapsed && "items-center gap-5")}>
              {groupedMenuItems[section].map((item) => {
                const isActive = item.path === '/dashboard'
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);
                const badge = getItemBadge(item);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={isCollapsed ? item.label : undefined}
                      className={cn(
                        "group relative h-14 overflow-visible  flex-row-reverse justify-end rounded-2xl px-4 text-slate-500",
                        isCollapsed && "mx-auto h-12 w-12 items-center justify-center rounded-2xl p-0",
                        isActive && "data-[active=true]:bg-[#7D26F7]! bg-[#7D26F7]! text-white shadow-[0_16px_42px_rgba(125,38,247,0.45)] before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:w-2/3 before:rounded-2xl before:bg-white/10 after:pointer-events-none after:absolute after:inset-y-0 after:right-10 after:w-16 after:-skew-x-28 after:bg-white/10",
                        !isActive && "hover:bg-slate-50 hover:text-slate-700"
                      )}
                    >
                      <Link to={item.path} className={cn("relative z-10 flex w-full items-center justify-end gap-3", isCollapsed && "justify-center")}>
                        {badge && (
                          <span className={cn(
                            "absolute flex h-8 min-w-10 items-center justify-center rounded-full bg-red-500 px-2 text-sm font-black text-white shadow-[0_10px_26px_rgba(239,68,68,0.5)]",
                            isCollapsed ? "-right-2 -top-2" : "left-3"
                          )}>
                            {badge}
                          </span>
                        )}
                        {!isCollapsed && <span className="text-base font-black">{item.label}</span>}
                        <HugeiconsIcon
                          icon={item.icon}
                          size={24}
                          strokeWidth={2.1}
                          className={cn(
                          "h-6 w-6 transition-transform",
                          isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                          )}
                        />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </div>
        ))}
      </SidebarContent>

      <SidebarFooter className={cn("bg-white p-4", isCollapsed && "px-2")}>
        {!isCollapsed ? (
          <div
            onDoubleClick={handleLogout}
            title="انقر مرتين لتسجيل الخروج"
            className="flex h-18 cursor-pointer items-center justify-between rounded-[1.7rem] bg-linear-to-r from-cyan-400 via-sky-500 to-violet-500 px-4 text-white shadow-[0_18px_45px_rgba(56,189,248,0.24)]"
          >
            <ChevronDown className="h-4 w-4 shrink-0 stroke-3 text-white" />
            <div className="min-w-0 flex-1 px-3 text-right">
              <p className="truncate text-sm font-semibold leading-5">{user?.name || 'محمد علي يوسف'}</p>
              <p className="mt-0.5 text-xs font-medium leading-4 text-white/85">{getRoleLabel(user?.role || 'owner')}</p>
            </div>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 ring-2 ring-white/15">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-sm font-bold text-white shadow-[inset_0_0_18px_rgba(255,255,255,0.16)]">
                {user?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'MA'}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="rounded-xl bg-slate-50 p-2 text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"
              aria-label="فتح القائمة"
            >
              <SidebarToggleIcon className="h-5 w-5 text-[#04496D]" />
            </button>
            <div
              onDoubleClick={handleLogout}
              title="انقر مرتين لتسجيل الخروج"
              className="grid h-12 w-12 cursor-pointer place-items-center rounded-2xl bg-linear-to-l from-violet-500 via-sky-500 to-cyan-400 shadow-[0_18px_45px_rgba(56,189,248,0.22)]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-linear-to-br from-cyan-400 to-violet-600 text-xs font-black text-white">
                {user?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'MA'}
              </span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

const SidebarToggleIcon = ({ className }: { className?: string }) => (
  <HugeiconsIcon
    icon={ArrowLeft01Icon}
    size={19}
    strokeWidth={2.2}
    className={cn("text-[#04496D]", className)}
  />
);

export default AppSidebar;
export { SidebarProvider };
