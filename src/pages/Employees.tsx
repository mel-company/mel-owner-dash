const Employees = () => {
  const employees = [
    {
      id: 1,
      name: 'أحمد محمد',
      email: 'ahmed@mel.iq',
      role: 'موظف',
      department: 'المبيعات',
      status: 'نشط',
      joinDate: '2024-01-15',
      lastActive: 'منذ ساعتين',
    },
    {
      id: 2,
      name: 'فاطمة علي',
      email: 'fatima@mel.iq',
      role: 'موظف',
      department: 'التسويق',
      status: 'نشط',
      joinDate: '2024-02-20',
      lastActive: 'منذ 5 ساعات',
    },
    {
      id: 3,
      name: 'خالد حسن',
      email: 'khalid@mel.iq',
      role: 'موظف',
      department: 'الدعم الفني',
      status: 'نشط',
      joinDate: '2024-03-10',
      lastActive: 'منذ يوم',
    },
    {
      id: 4,
      name: 'سارة أحمد',
      email: 'sara@mel.iq',
      role: 'دعم فني',
      department: 'الدعم الفني',
      status: 'غير نشط',
      joinDate: '2024-01-05',
      lastActive: 'منذ 3 أيام',
    },
  ];

  const getStatusColor = (status: string) => {
    return status === 'نشط'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-700';
  };

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      'موظف': 'bg-blue-100 text-blue-700',
      'دعم فني': 'bg-purple-100 text-purple-700',
      'المالك': 'bg-yellow-100 text-yellow-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">الموظفين</h1>
          <p className="text-gray-600">إدارة الموظفين والصلاحيات</p>
        </div>
        <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold">
          + إضافة موظف
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">إجمالي الموظفين</p>
          <p className="text-2xl font-bold text-gray-800">15</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">الموظفين النشطين</p>
          <p className="text-2xl font-bold text-green-600">12</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">موظفي المبيعات</p>
          <p className="text-2xl font-bold text-blue-600">5</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">دعم فني</p>
          <p className="text-2xl font-bold text-purple-600">4</p>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">البريد الإلكتروني</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الدور</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">القسم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الانضمام</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">آخر نشاط</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{employee.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{employee.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(employee.role)}`}>
                      {employee.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{employee.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{employee.joinDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{employee.lastActive}</td>
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

export default Employees;
