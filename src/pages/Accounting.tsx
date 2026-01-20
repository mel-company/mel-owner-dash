const Accounting = () => {
  const transactions = [
    {
      id: 1,
      type: 'دفعة',
      store: 'متجر الأزياء الحديث',
      amount: 5000,
      date: '2024-11-15',
      status: 'مكتمل',
      method: 'تحويل بنكي',
    },
    {
      id: 2,
      type: 'دفعة',
      store: 'متجر الإلكترونيات',
      amount: 3000,
      date: '2024-11-14',
      status: 'مكتمل',
      method: 'بطاقة ائتمانية',
    },
    {
      id: 3,
      type: 'إشتراك',
      store: 'متجر الكتب',
      amount: 2000,
      date: '2024-11-13',
      status: 'مكتمل',
      method: 'تحويل بنكي',
    },
    {
      id: 4,
      type: 'دفعة',
      store: 'متجر الأدوات الرياضية',
      amount: 1500,
      date: '2024-11-12',
      status: 'قيد المعالجة',
      method: 'بطاقة ائتمانية',
    },
  ];

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'مكتمل': 'bg-green-100 text-green-700',
      'قيد المعالجة': 'bg-yellow-100 text-yellow-700',
      'ملغى': 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const totalRevenue = transactions
    .filter(t => t.status === 'مكتمل')
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingAmount = transactions
    .filter(t => t.status === 'قيد المعالجة')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">المحاسبة</h1>
        <p className="text-gray-600">إدارة المعاملات المالية</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">إجمالي الإيرادات</p>
          <p className="text-2xl font-bold text-green-600">{totalRevenue.toLocaleString()} د.ع</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">المعلقة</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingAmount.toLocaleString()} د.ع</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">المعاملات هذا الشهر</p>
          <p className="text-2xl font-bold text-blue-600">{transactions.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">متوسط المعاملة</p>
          <p className="text-2xl font-bold text-purple-600">
            {Math.round(totalRevenue / transactions.filter(t => t.status === 'مكتمل').length).toLocaleString()} د.ع
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option>جميع المعاملات</option>
            <option>دفعات</option>
            <option>اشتراكات</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option>جميع الحالات</option>
            <option>مكتمل</option>
            <option>قيد المعالجة</option>
            <option>ملغى</option>
          </select>
          <input
            type="date"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold">
            تصدير
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-md overflow-y-hidden">
        <div className="overflow-x-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المعاملة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتجر</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">طريقة الدفع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{transaction.type}</div>
                    <div className="text-sm text-gray-500">#{transaction.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{transaction.store}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{transaction.amount.toLocaleString()} د.ع</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{transaction.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{transaction.method}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-blue-600 hover:text-blue-800">عرض</button>
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

export default Accounting;
