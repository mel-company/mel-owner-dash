import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    {
      title: 'إجمالي المتاجر',
      value: '24',
      change: '+12%',
      icon: '🏪',
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      changeColor: 'text-green-600',
      borderColor: 'border-blue-200',
    },
    {
      title: 'الموظفين النشطين',
      value: '15',
      change: '+3',
      icon: '👥',
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50 to-emerald-50',
      changeColor: 'text-green-600',
      borderColor: 'border-green-200',
    },
    {
      title: 'إجمالي الإيرادات',
      value: '125,000',
      change: '+8%',
      icon: '💰',
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50',
      changeColor: 'text-green-600',
      currency: 'دينار',
      borderColor: 'border-purple-200',
    },
    {
      title: 'التذاكر المفتوحة',
      value: '8',
      change: '-4',
      icon: '🎫',
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-50 to-red-50',
      changeColor: 'text-red-600',
      borderColor: 'border-orange-200',
    },
    {
      title: 'الاشتراكات النشطة',
      value: '18',
      change: '+5',
      icon: '📋',
      gradient: 'from-indigo-500 to-purple-500',
      bgGradient: 'from-indigo-50 to-purple-50',
      changeColor: 'text-green-600',
      borderColor: 'border-indigo-200',
    },
    {
      title: 'الطلبات اليوم',
      value: '142',
      change: '+23%',
      icon: '📦',
      gradient: 'from-pink-500 to-rose-500',
      bgGradient: 'from-pink-50 to-rose-50',
      changeColor: 'text-green-600',
      borderColor: 'border-pink-200',
    },
  ];

  const recentActivity = [
    { 
      id: 1, 
      action: 'متجر جديد تم إنشاؤه', 
      time: 'منذ ساعتين', 
      type: 'store', 
      color: 'bg-blue-100 text-blue-700',
      icon: '🏪'
    },
    { 
      id: 2, 
      action: 'دفعة جديدة تم استلامها', 
      time: 'منذ 3 ساعات', 
      type: 'payment', 
      color: 'bg-green-100 text-green-700',
      icon: '💰'
    },
    { 
      id: 3, 
      action: 'موظف جديد تم إضافته', 
      time: 'منذ 5 ساعات', 
      type: 'employee', 
      color: 'bg-purple-100 text-purple-700',
      icon: '👥'
    },
    { 
      id: 4, 
      action: 'تذكرة دعم تم حلها', 
      time: 'منذ يوم', 
      type: 'support', 
      color: 'bg-orange-100 text-orange-700',
      icon: '🎫'
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-24 -mb-24"></div>
        </div>
        
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">👋</span>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-1">
                  مرحباً بك، {user?.name}
                </h1>
                <p className="text-indigo-100 text-base md:text-lg">
                  نظرة سريعة على إحصائيات mel.iq
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/30 shadow-lg">
              <p className="text-xs text-indigo-100 mb-1 font-medium">التاريخ</p>
              <p className="text-xl font-bold">
                {new Date().toLocaleDateString('ar-IQ', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${stat.bgGradient} rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 ${stat.borderColor} group`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-16 h-16 bg-gradient-to-br ${stat.gradient} rounded-2xl flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {stat.icon}
              </div>
              <div className="text-left">
                <span className={`text-sm font-bold px-3 py-1.5 rounded-lg bg-white/80 backdrop-blur-sm ${stat.changeColor} shadow-sm`}>
                  {stat.change}
                </span>
              </div>
            </div>
            
            <h3 className="text-gray-700 text-sm font-semibold mb-3">{stat.title}</h3>
            
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-gray-900">
                {stat.value}
              </p>
              {stat.currency && (
                <span className="text-lg text-gray-600 font-medium">
                  {stat.currency}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">النشاطات الأخيرة</h2>
              <p className="text-sm text-gray-500">آخر التحديثات في النظام</p>
            </div>
          </div>
          <button className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-indigo-50 transition-all">
            عرض الكل →
          </button>
        </div>
        
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-indigo-300 group cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${activity.color} shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  {activity.icon}
                </div>
                <div className="flex-1">
                  <span className="text-gray-800 font-bold block mb-1 text-lg">
                    {activity.action}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{activity.time}</span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    <span className="text-xs text-gray-400 capitalize">{activity.type}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                  عرض →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
