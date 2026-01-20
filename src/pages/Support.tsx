const Support = () => {
  const tickets = [
    {
      id: 'TKT-001',
      title: 'مشكلة في الدفع',
      store: 'متجر الأزياء الحديث',
      priority: 'عالية',
      status: 'مفتوحة',
      assignee: 'أحمد محمد',
      createdAt: '2024-11-15',
      lastUpdate: 'منذ ساعتين',
      category: 'دفع',
    },
    {
      id: 'TKT-002',
      title: 'طلب استرجاع منتج',
      store: 'متجر الإلكترونيات',
      priority: 'متوسطة',
      status: 'قيد المعالجة',
      assignee: 'فاطمة علي',
      createdAt: '2024-11-14',
      lastUpdate: 'منذ 5 ساعات',
      category: 'مبيعات',
    },
    {
      id: 'TKT-003',
      title: 'مشكلة تقنية في الموقع',
      store: 'متجر الكتب',
      priority: 'عالية',
      status: 'مفتوحة',
      assignee: 'غير معين',
      createdAt: '2024-11-13',
      lastUpdate: 'منذ يوم',
      category: 'تقنية',
    },
    {
      id: 'TKT-004',
      title: 'استفسار عن الاشتراك',
      store: 'متجر الأدوات الرياضية',
      priority: 'منخفضة',
      status: 'مغلقة',
      assignee: 'خالد حسن',
      createdAt: '2024-11-12',
      lastUpdate: 'منذ 3 أيام',
      category: 'اشتراك',
    },
  ];

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      'عالية': 'bg-red-100 text-red-700',
      'متوسطة': 'bg-yellow-100 text-yellow-700',
      'منخفضة': 'bg-green-100 text-green-700',
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'مفتوحة': 'bg-blue-100 text-blue-700',
      'قيد المعالجة': 'bg-yellow-100 text-yellow-700',
      'مغلقة': 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'مفتوحة').length,
    inProgress: tickets.filter(t => t.status === 'قيد المعالجة').length,
    closed: tickets.filter(t => t.status === 'مغلقة').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">داشبورد الدعم الفني</h1>
          <p className="text-gray-600">إدارة تذاكر الدعم والمستوى</p>
        </div>
        <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold">
          + تذكرة جديدة
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">إجمالي التذاكر</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">المفتوحة</p>
          <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">قيد المعالجة</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">المغلقة</p>
          <p className="text-2xl font-bold text-green-600">{stats.closed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option>جميع الحالات</option>
            <option>مفتوحة</option>
            <option>قيد المعالجة</option>
            <option>مغلقة</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option>جميع الأولويات</option>
            <option>عالية</option>
            <option>متوسطة</option>
            <option>منخفضة</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option>جميع الفئات</option>
            <option>دفع</option>
            <option>مبيعات</option>
            <option>تقنية</option>
            <option>اشتراك</option>
          </select>
          <input
            type="text"
            placeholder="بحث..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none flex-1"
          />
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم التذكرة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العنوان</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتجر</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفئة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الأولوية</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المكلف</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">آخر تحديث</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-blue-600">{ticket.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{ticket.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{ticket.store}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{ticket.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{ticket.assignee}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">{ticket.lastUpdate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-blue-600 hover:text-blue-800 mr-4">عرض</button>
                    <button className="text-gray-600 hover:text-gray-800">تعديل</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Support;
