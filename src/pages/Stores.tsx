const Stores = () => {
  const stores = [
    {
      id: 1,
      name: 'متجر الأزياء الحديث',
      owner: 'أحمد محمد',
      subscription: 'Premium',
      status: 'نشط',
      revenue: '45,000',
      orders: 234,
      expiryDate: '2024-12-31',
    },
    {
      id: 2,
      name: 'متجر الإلكترونيات',
      owner: 'فاطمة علي',
      subscription: 'Basic',
      status: 'نشط',
      revenue: '32,000',
      orders: 189,
      expiryDate: '2024-11-15',
    },
    {
      id: 3,
      name: 'متجر الكتب',
      owner: 'خالد حسن',
      subscription: 'Pro',
      status: 'نشط',
      revenue: '28,500',
      orders: 156,
      expiryDate: '2025-01-20',
    },
    {
      id: 4,
      name: 'متجر الأدوات الرياضية',
      owner: 'سارة أحمد',
      subscription: 'Basic',
      status: 'منتهي',
      revenue: '15,000',
      orders: 98,
      expiryDate: '2024-10-05',
    },
  ];

  const getSubscriptionColor = (plan: string) => {
    const colors: { [key: string]: string } = {
      'Premium': 'bg-purple-100 text-purple-700',
      'Pro': 'bg-blue-100 text-blue-700',
      'Basic': 'bg-gray-100 text-gray-700',
    };
    return colors[plan] || 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status: string) => {
    return status === 'نشط'
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">المتاجر</h1>
          <p className="text-gray-600">إدارة المتاجر والاشتراكات</p>
        </div>
        <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold">
          + إضافة متجر
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-lg p-5 border border-blue-100">
          <p className="text-gray-600 text-sm mb-2 font-semibold">إجمالي المتاجر</p>
          <p className="text-3xl font-bold text-blue-600">24</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg p-5 border border-green-100">
          <p className="text-gray-600 text-sm mb-2 font-semibold">المتاجر النشطة</p>
          <p className="text-3xl font-bold text-green-600">18</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl shadow-lg p-5 border border-red-100">
          <p className="text-gray-600 text-sm mb-2 font-semibold">الاشتراكات المنتهية</p>
          <p className="text-3xl font-bold text-red-600">6</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg p-5 border border-purple-100">
          <p className="text-gray-600 text-sm mb-2 font-semibold">إجمالي الإيرادات</p>
          <p className="text-3xl font-bold text-purple-600">120,500 د.ع</p>
        </div>
      </div>

      {/* Stores Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        <div className="overflow-x-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">اسم المتجر</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المالك</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاشتراك</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإيرادات</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الطلبات</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الانتهاء</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stores.map((store) => (
                <tr key={store.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{store.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{store.owner}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSubscriptionColor(store.subscription)}`}>
                      {store.subscription}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(store.status)}`}>
                      {store.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{store.revenue} د.ع</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{store.orders}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{store.expiryDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-indigo-600 hover:text-indigo-700 font-semibold mr-4 hover:underline">عرض</button>
                    <button className="text-gray-600 hover:text-gray-800 font-semibold hover:underline">تعديل</button>
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

export default Stores;
