const SubscriptionPlans = () => {
  const plans = [
    {
      id: 1,
      name: 'Basic',
      price: 50000,
      duration: 'شهري',
      features: [
        'متجر واحد',
        'حتى 100 منتج',
        'دعم عبر البريد الإلكتروني',
        'تقارير أساسية',
      ],
      activeStores: 12,
      color: 'bg-gray-500',
    },
    {
      id: 2,
      name: 'Pro',
      price: 100000,
      duration: 'شهري',
      features: [
        '3 متاجر',
        'منتجات غير محدودة',
        'دعم فني متقدم',
        'تقارير تفصيلية',
        'تكامل مع شركات التوصيل',
      ],
      activeStores: 8,
      color: 'bg-blue-500',
    },
    {
      id: 3,
      name: 'Premium',
      price: 150000,
      duration: 'شهري',
      features: [
        'متاجر غير محدودة',
        'منتجات غير محدودة',
        'دعم فني على مدار الساعة',
        'تقارير متقدمة',
        'تكامل كامل مع جميع الخدمات',
        'إدارة محتوى متقدمة',
        'API مخصص',
      ],
      activeStores: 4,
      color: 'bg-purple-500',
    },
  ];

  const subscriptions = [
    { id: 1, store: 'متجر الأزياء الحديث', plan: 'Premium', startDate: '2024-01-01', endDate: '2024-12-31', status: 'نشط' },
    { id: 2, store: 'متجر الإلكترونيات', plan: 'Basic', startDate: '2024-02-01', endDate: '2024-11-30', status: 'نشط' },
    { id: 3, store: 'متجر الكتب', plan: 'Pro', startDate: '2024-03-01', endDate: '2025-01-31', status: 'نشط' },
    { id: 4, store: 'متجر الأدوات الرياضية', plan: 'Basic', startDate: '2024-01-01', endDate: '2024-10-05', status: 'منتهي' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">خطط الاشتراكات</h1>
          <p className="text-gray-600">إدارة الخطط والاشتراكات</p>
        </div>
        <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold">
          + إضافة خطة جديدة
        </button>
      </div>

      {/* Plans Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition"
          >
            <div className={`${plan.color} w-16 h-16 rounded-lg flex items-center justify-center text-white text-2xl font-bold mb-4`}>
              {plan.name.charAt(0)}
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-gray-900">{plan.price.toLocaleString()}</span>
              <span className="text-gray-600 mr-2">د.ع / {plan.duration}</span>
            </div>
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-gray-600">
                  <span className="text-green-500">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-1">المتاجر النشطة</p>
              <p className="text-xl font-bold text-gray-800">{plan.activeStores}</p>
            </div>
            <button className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold">
              تعديل الخطة
            </button>
          </div>
        ))}
      </div>

      {/* Active Subscriptions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">الاشتراكات النشطة</h2>
        <div className="overflow-x-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتجر</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الخطة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ البداية</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الانتهاء</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{sub.store}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      sub.plan === 'Premium' ? 'bg-purple-100 text-purple-700' :
                      sub.plan === 'Pro' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {sub.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{sub.startDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{sub.endDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      sub.status === 'نشط' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
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

export default SubscriptionPlans;
