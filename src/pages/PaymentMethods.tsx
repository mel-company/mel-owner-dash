const PaymentMethods = () => {
  const methods = [
    {
      id: 1,
      name: 'البطاقة الائتمانية',
      provider: 'Stripe',
      status: 'نشطة',
      stores: 18,
      monthlyTransactions: 1240,
      successRate: 98.5,
      fees: 2.5,
    },
    {
      id: 2,
      name: 'التحويل البنكي',
      provider: 'البنك المركزي',
      status: 'نشطة',
      stores: 22,
      monthlyTransactions: 890,
      successRate: 95.2,
      fees: 1.0,
    },
    {
      id: 3,
      name: 'المحفظة الإلكترونية',
      provider: 'Zain Cash',
      status: 'نشطة',
      stores: 15,
      monthlyTransactions: 650,
      successRate: 97.8,
      fees: 1.5,
    },
    {
      id: 4,
      name: 'الدفع عند الاستلام',
      provider: 'نظام داخلي',
      status: 'نشطة',
      stores: 20,
      monthlyTransactions: 520,
      successRate: 100,
      fees: 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">طرق الدفع</h1>
          <p className="text-gray-600">إدارة طرق الدفع والتكامل</p>
        </div>
        <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold">
          + إضافة طريقة دفع
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">إجمالي الطرق</p>
          <p className="text-2xl font-bold text-gray-800">{methods.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">النشطة</p>
          <p className="text-2xl font-bold text-green-600">
            {methods.filter(m => m.status === 'نشطة').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">إجمالي المعاملات</p>
          <p className="text-2xl font-bold text-blue-600">
            {methods.reduce((sum, m) => sum + m.monthlyTransactions, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">متوسط معدل النجاح</p>
          <p className="text-2xl font-bold text-purple-600">
            {(methods.reduce((sum, m) => sum + m.successRate, 0) / methods.length).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Payment Methods Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">طريقة الدفع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المزود</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتاجر</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المعاملات الشهرية</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">معدل النجاح</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرسوم (%)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {methods.map((method) => (
                <tr key={method.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{method.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{method.provider}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      method.status === 'نشطة' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {method.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{method.stores}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{method.monthlyTransactions.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${method.successRate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{method.successRate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {method.fees > 0 ? `${method.fees}%` : 'مجاني'}
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

export default PaymentMethods;
