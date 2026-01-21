import { useState, useEffect } from 'react';
import { systemEmployeesService, type SystemEmployee, type CreateEmployeeRequest } from '../services/systemEmployeesService';

const Employees = () => {
  const [employees, setEmployees] = useState<SystemEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<SystemEmployee | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateEmployeeRequest>({
    name: '',
    email: '',
    phone: '',
    role: '',
    password: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await systemEmployeesService.getAllEmployees({ page: 1, limit: 100 });
      setEmployees(response.data || []);
    } catch (err) {
      setError('فشل في جلب الموظفين. يرجى المحاولة مرة أخرى.');
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await systemEmployeesService.createEmployee(formData);
      setShowModal(false);
      resetForm();
      fetchEmployees();
    } catch (err) {
      setError('فشل في إنشاء الموظف. يرجى المحاولة مرة أخرى.');
      console.error('Error creating employee:', err);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    
    try {
      setError('');
      await systemEmployeesService.updateEmployee(editingEmployee.id, formData);
      setShowModal(false);
      setEditingEmployee(null);
      resetForm();
      fetchEmployees();
    } catch (err) {
      setError('فشل في تحديث الموظف. يرجى المحاولة مرة أخرى.');
      console.error('Error updating employee:', err);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      setError('');
      await systemEmployeesService.deleteEmployee(id);
      setShowDeleteConfirm(null);
      fetchEmployees();
    } catch (err) {
      setError('فشل في حذف الموظف. يرجى المحاولة مرة أخرى.');
      console.error('Error deleting employee:', err);
    }
  };

  const openEditModal = (employee: SystemEmployee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone || '',
      role: employee.role || '',
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingEmployee(null);
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: '',
      password: '',
    });
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    return status === 'active' || status === 'ACTIVE'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-700';
  };

  const getRoleColor = (role: string | undefined) => {
    if (!role) return 'bg-gray-100 text-gray-700';
    const colors: { [key: string]: string } = {
      'EMPLOYEE': 'bg-blue-100 text-blue-700',
      'SUPPORT': 'bg-purple-100 text-purple-700',
      'OWNER': 'bg-yellow-100 text-yellow-700',
      'DEVELOPER': 'bg-yellow-100 text-yellow-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (status: string | undefined) => {
    if (!status) return 'غير محدد';
    return status === 'active' || status === 'ACTIVE' ? 'نشط' : 'غير نشط';
  };

  const getRoleText = (role: string | undefined) => {
    if (!role) return 'غير محدد';
    const roleMap: { [key: string]: string } = {
      'EMPLOYEE': 'موظف',
      'SUPPORT': 'دعم فني',
      'OWNER': 'المالك',
      'DEVELOPER': 'مطور',
    };
    return roleMap[role] || role;
  };

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.status === 'active' || e.status === 'ACTIVE').length,
  };

  if (loading && employees.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">الموظفين</h1>
          <p className="text-gray-600">إدارة الموظفين والصلاحيات</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
        >
          + إضافة موظف
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">إجمالي الموظفين</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">الموظفين النشطين</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <p className="text-lg">لا يوجد موظفين</p>
            <button
              onClick={openCreateModal}
              className="mt-4 text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              إضافة موظف جديد
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">البريد الإلكتروني</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الهاتف</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الدور</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{employee.phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(employee.role)}`}>
                        {getRoleText(employee.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}>
                        {getStatusText(employee.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => openEditModal(employee)}
                        className="text-gray-600 hover:text-gray-800 font-semibold mr-4 hover:underline"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(employee.id)}
                        className="text-red-600 hover:text-red-700 font-semibold hover:underline"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingEmployee ? 'تعديل موظف' : 'إضافة موظف جديد'}
              </h2>
            </div>
            <form onSubmit={editingEmployee ? handleUpdateEmployee : handleCreateEmployee} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">البريد الإلكتروني *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الهاتف</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الدور</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              {!editingEmployee && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">كلمة المرور *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              )}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  {editingEmployee ? 'تحديث' : 'إنشاء'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingEmployee(null);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">تأكيد الحذف</h2>
            <p className="text-gray-600 mb-6">هل أنت متأكد من حذف هذا الموظف؟</p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDeleteEmployee(showDeleteConfirm)}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-all"
              >
                حذف
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
