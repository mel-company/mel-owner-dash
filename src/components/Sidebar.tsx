import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', label: 'الرئيسية', icon: '🏠', roles: ['owner', 'employee', 'support'] },
    { path: '/dashboard/stores', label: 'المتاجر', icon: '🏪', roles: ['owner', 'employee'] },
    { path: '/dashboard/employees', label: 'الموظفين', icon: '👥', roles: ['owner'] },
    { path: '/dashboard/accounting', label: 'المحاسبة', icon: '💰', roles: ['owner', 'employee'] },
    { path: '/dashboard/plans', label: 'خطط الاشتراكات', icon: '📋', roles: ['owner'] },
    { path: '/dashboard/support', label: 'الدعم الفني', icon: '🎫', roles: ['support', 'owner'] },
    { path: '/dashboard/delivery', label: 'شركات التوصيل', icon: '🚚', roles: ['owner'] },
    { path: '/dashboard/payments', label: 'طرق الدفع', icon: '💳', roles: ['owner'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role || '')
  );

  const getRoleLabel = (role: string) => {
    const roles: { [key: string]: string } = {
      'owner': 'المالك',
      'employee': 'موظف',
      'support': 'دعم فني'
    };
    return roles[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      'owner': 'from-yellow-500 to-orange-500',
      'employee': 'from-blue-500 to-indigo-500',
      'support': 'from-purple-500 to-pink-500'
    };
    return colors[role] || 'from-gray-500 to-gray-600';
  };

  return (
    <aside className="w-72 bg-white shadow-2xl fixed right-0 top-0 h-full overflow-y-hidden border-l border-gray-100 z-10 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">M</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">mel.iq</h1>
            <p className="text-xs text-indigo-100">لوحة التحكم</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-hidden">
        {filteredMenuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 transform scale-[1.02]'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
              }`}
            >
              <span className={`text-xl ${isActive ? 'scale-110' : ''} transition-transform`}>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <div className="mb-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
          <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-block w-2 h-2 rounded-full bg-gradient-to-r ${getRoleColor(user?.role || '')}`}></span>
            <p className="text-xs text-gray-600">{getRoleLabel(user?.role || '')}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full px-4 py-3 bg-gradient-to-r from-red-50 to-pink-50 text-red-600 rounded-xl hover:from-red-100 hover:to-pink-100 transition-all font-semibold text-sm border border-red-200 hover:border-red-300 shadow-sm hover:shadow"
        >
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
