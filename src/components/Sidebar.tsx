import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Store,
  Users,
  Wallet,
  FileText,
  Headphones,
  Truck,
  CreditCard,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Code,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const AppSidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useShadcnSidebar();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems: Array<{
    path: string;
    label: string;
    icon: LucideIcon;
    roles: Array<'owner' | 'employee' | 'support' | 'developer'>;
  }> = [
    { path: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, roles: ['owner', 'employee', 'support'] },
    { path: '/dashboard/stores', label: 'إدارة المتاجر', icon: Store, roles: ['owner', 'employee'] },
    { path: '/dashboard/employees', label: 'الموظفين', icon: Users, roles: ['owner'] },
    { path: '/dashboard/accounting', label: 'الحسابات المالية', icon: Wallet, roles: ['owner', 'employee'] },
    { path: '/dashboard/plans', label: 'باقات الاشتراك', icon: FileText, roles: ['owner'] },
    { path: '/dashboard/support', label: 'الدعم الفني', icon: Headphones, roles: ['support', 'owner'] },
    { path: '/dashboard/delivery', label: 'شركات الشحن', icon: Truck, roles: ['owner'] },
    { path: '/dashboard/payments', label: 'بوابات الدفع', icon: CreditCard, roles: ['owner'] },
    { path: '/developer', label: 'مطور النظام', icon: Code, roles: ['developer'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role as 'owner' | 'employee' | 'support' | 'developer'  )
  );

  const getRoleLabel = (role: string) => {
    const roles: { [key: string]: string } = {
      'owner': 'مدير النظام',
      'employee': 'موظف',
      'support': 'دعم فني',
      'developer': 'مطور النظام'
    };
    return roles[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: { [key: string]: string } = {
      'owner': 'from-amber-500 to-orange-500',
      'employee': 'from-blue-500 to-indigo-500',
      'support': 'from-purple-500 to-pink-500',
      'developer': 'from-green-500 to-lime-500'
    };
    return colors[role] || 'from-gray-500 to-gray-600';
  };

  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar 
      side="right" 
      collapsible="icon" 
      variant="sidebar"
      className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-l border-slate-700/50"
    >
      <SidebarHeader className="p-5 border-b border-slate-700/50">
        <div className={cn(
          "flex items-center gap-3",
          isCollapsed ? "justify-center flex-col" : "justify-between"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-xl shadow-blue-500/40 ring-2 ring-blue-400/30 transition-transform hover:scale-105">
              <span className="text-xl font-black text-white">M</span>
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-lg font-black text-white tracking-tight">mel.iq</h1>
                <p className="text-xs text-slate-400 font-medium">نظام إدارة المتاجر</p>
              </div>
            )}
          </div>
          
          <button
            onClick={toggleSidebar}
            className="text-slate-400 hover:text-white hover:bg-slate-700/50 p-2 rounded-lg transition-all"
            aria-label={isCollapsed ? 'فتح القائمة' : 'إغلاق القائمة'}
          >
            {isCollapsed ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarMenu>
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const IconComponent = item.icon;
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={isCollapsed ? item.label : undefined}
                  className={cn(
                    "group relative overflow-hidden",
                    isActive && "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30",
                    !isActive && "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  )}
                >
                  <Link to={item.path}>
                    <IconComponent className={cn(
                      "h-5 w-5 transition-transform",
                      isActive && "scale-110",
                      !isActive && "group-hover:scale-105"
                    )} />
                    <span className="font-semibold text-sm">{item.label}</span>
                    {isActive && !isCollapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-slate-700/50 bg-slate-900">
        {!isCollapsed ? (
          <div className="space-y-3">
            <div className="p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/20">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{user?.name || 'المستخدم'}</p>
              <span className={cn(
                "inline-flex items-start py-1.5 rounded-lg text-xs font-bold shadow-md  text-white",
                getRoleBadgeColor(user?.role || '')
              )}>

                {getRoleLabel(user?.role || '')}
              </span>
                </div>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all"
            >
              <LogOut className="h-4 w-4 ml-2" />
              تسجيل الخروج
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 items-center">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/20">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <Button
              onClick={handleLogout}
              variant="destructive"
              size="icon"
              className="w-11 h-11 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg shadow-red-500/30 hover:shadow-xl transition-all"
              title="تسجيل الخروج"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
export { SidebarProvider };
