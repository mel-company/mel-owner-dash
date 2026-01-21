import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { systemStoresService, type Store, type CreateStoreRequest } from '../services/systemStoresService';

const Stores = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<CreateStoreRequest>({
    name: '',
    owner: '',
    ownerEmail: '',
    subscriptionPlanId: '',
    status: 'active',
  });

  // Fetch stores on component mount
  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await systemStoresService.getAllStores();
      setStores(response.data || []);
    } catch (err) {
      setError('فشل في جلب المتاجر. يرجى المحاولة مرة أخرى.');
      console.error('Error fetching stores:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await systemStoresService.createStore(formData);
      setShowModal(false);
      resetForm();
      fetchStores();
    } catch (err) {
      setError('فشل في إنشاء المتجر. يرجى المحاولة مرة أخرى.');
      console.error('Error creating store:', err);
    }
  };

  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;
    
    try {
      setError('');
      await systemStoresService.updateStore(editingStore.id, formData);
      setShowModal(false);
      setEditingStore(null);
      resetForm();
      fetchStores();
    } catch (err) {
      setError('فشل في تحديث المتجر. يرجى المحاولة مرة أخرى.');
      console.error('Error updating store:', err);
    }
  };

  const handleDeleteStore = async (id: string) => {
    try {
      setError('');
      await systemStoresService.deleteStore(id);
      setShowDeleteConfirm(null);
      fetchStores();
    } catch (err) {
      setError('فشل في حذف المتجر. يرجى المحاولة مرة أخرى.');
      console.error('Error deleting store:', err);
    }
  };

  const openEditModal = (store: Store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      owner: store.owner?.name || '',
      ownerEmail: store.owner?.email || store.email || '',
      subscriptionPlanId: store.subscription?.plan.id || '',
      status: store.subscription?.status === 'CANCELLED' || store.subscription?.status === 'EXPIRED' ? 'inactive' : 'active',
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingStore(null);
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      owner: '',
      ownerEmail: '',
      subscriptionPlanId: '',
      status: 'active',
    });
  };

  const viewStoreDetails = (id: string) => {
    navigate(`/dashboard/stores/${id}`);
  };

  // Calculate stats
  const stats = {
    total: stores.length,
    active: stores.filter(s => s.subscription?.status === 'ACTIVE').length,
    expired: stores.filter(s => s.subscription?.status === 'EXPIRED' || s.subscription?.status === 'CANCELLED').length,
    totalRevenue: 0, // Revenue not available in current response
  };

  const getSubscriptionColor = (planName: string | null | undefined) => {
    if (!planName) return 'bg-gray-100 text-gray-700';
    const colors: { [key: string]: string } = {
      'Premium': 'bg-purple-100 text-purple-700',
      'Pro': 'bg-blue-100 text-blue-700',
      'Go': 'bg-green-100 text-green-700',
      'Basic': 'bg-gray-100 text-gray-700',
    };
    return colors[planName] || 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    const statusMap: { [key: string]: string } = {
      'ACTIVE': 'bg-green-100 text-green-700',
      'CANCELLED': 'bg-red-100 text-red-700',
      'EXPIRED': 'bg-red-100 text-red-700',
      'PAUSED': 'bg-yellow-100 text-yellow-700',
    };
    return statusMap[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (status: string | null | undefined) => {
    if (!status) return 'بدون اشتراك';
    const statusMap: { [key: string]: string } = {
      'ACTIVE': 'نشط',
      'CANCELLED': 'ملغى',
      'EXPIRED': 'منتهي',
      'PAUSED': 'متوقف',
    };
    return statusMap[status] || status;
  };

  if (loading && stores.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">المتاجر</h1>
          <p className="text-gray-600">إدارة المتاجر والاشتراكات</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
        >
          + إضافة متجر
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
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-lg p-5 border border-blue-100">
          <p className="text-gray-600 text-sm mb-2 font-semibold">إجمالي المتاجر</p>
          <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg p-5 border border-green-100">
          <p className="text-gray-600 text-sm mb-2 font-semibold">المتاجر النشطة</p>
          <p className="text-3xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl shadow-lg p-5 border border-red-100">
          <p className="text-gray-600 text-sm mb-2 font-semibold">الاشتراكات المنتهية</p>
          <p className="text-3xl font-bold text-red-600">{stats.expired}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg p-5 border border-purple-100">
          <p className="text-gray-600 text-sm mb-2 font-semibold">إجمالي الإيرادات</p>
          <p className="text-3xl font-bold text-purple-600">
            {stats.totalRevenue.toLocaleString('ar-IQ')} د.ع
          </p>
        </div>
      </div>

      {/* Stores Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : stores.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <p className="text-lg">لا توجد متاجر</p>
            <button
              onClick={openCreateModal}
              className="mt-4 text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              إضافة متجر جديد
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {store.owner?.name || store.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSubscriptionColor(store.subscription?.plan.name)}`}>
                        {store.subscription?.plan.name || 'بدون خطة'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(store.subscription?.status)}`}>
                        {getStatusText(store.subscription?.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      - {/* Revenue not available */}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {store.subscription?.end_at ? new Date(store.subscription.end_at).toLocaleDateString('ar-IQ') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => viewStoreDetails(store.id)}
                        className="text-indigo-600 hover:text-indigo-700 font-semibold mr-4 hover:underline"
                      >
                        عرض
                      </button>
                      <button
                        onClick={() => openEditModal(store)}
                        className="text-gray-600 hover:text-gray-800 font-semibold mr-4 hover:underline"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(store.id)}
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
                {editingStore ? 'تعديل متجر' : 'إضافة متجر جديد'}
              </h2>
            </div>
            <form onSubmit={editingStore ? handleUpdateStore : handleCreateStore} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  اسم المتجر *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  اسم المالك *
                </label>
                <input
                  type="text"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  البريد الإلكتروني للمالك *
                </label>
                <input
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  معرف خطة الاشتراك *
                </label>
                <input
                  type="text"
                  value={formData.subscriptionPlanId}
                  onChange={(e) => setFormData({ ...formData, subscriptionPlanId: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الحالة *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  {editingStore ? 'تحديث' : 'إنشاء'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingStore(null);
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
            <p className="text-gray-600 mb-6">هل أنت متأكد من حذف هذا المتجر؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDeleteStore(showDeleteConfirm)}
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

export default Stores;
