const DeliveryCompanies = () => {
  const companies = [
    {
      id: 1,
      name: 'شركة التوصيل السريع',
      contact: 'info@delivery.com',
      phone: '07501234567',
      status: 'نشطة',
      stores: 12,
      monthlyOrders: 450,
      rating: 4.5,
    },
    {
      id: 2,
      name: 'خدمات التوصيل الحديثة',
      contact: 'info@modern-delivery.com',
      phone: '07507654321',
      status: 'نشطة',
      stores: 8,
      monthlyOrders: 320,
      rating: 4.8,
    },
    {
      id: 3,
      name: 'توصيل إكسبرس',
      contact: 'info@express-delivery.com',
      phone: '07509876543',
      status: 'غير نشطة',
      stores: 4,
      monthlyOrders: 150,
      rating: 4.2,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">شركات التوصيل</h1>
          <p className="text-gray-600">إدارة شركات التوصيل والتكامل</p>
        </div>
        <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold">
          + إضافة شركة
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">إجمالي الشركات</p>
          <p className="text-2xl font-bold text-gray-800">{companies.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">الشركات النشطة</p>
          <p className="text-2xl font-bold text-green-600">
            {companies.filter(c => c.status === 'نشطة').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">إجمالي الطلبات الشهرية</p>
          <p className="text-2xl font-bold text-blue-600">
            {companies.reduce((sum, c) => sum + c.monthlyOrders, 0)}
          </p>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company) => (
          <div key={company.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">{company.name}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                company.status === 'نشطة' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {company.status}
              </span>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-gray-600">
                <span>📧</span>
                <span className="text-sm">{company.contact}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span>📱</span>
                <span className="text-sm">{company.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span>⭐</span>
                <span className="text-sm">التقييم: {company.rating}/5</span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">المتاجر المرتبطة</span>
                <span className="font-bold text-gray-800">{company.stores}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600">الطلبات الشهرية</span>
                <span className="font-bold text-gray-800">{company.monthlyOrders}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition text-sm">
                عرض التفاصيل
              </button>
              <button className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition text-sm">
                تعديل
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeliveryCompanies;
