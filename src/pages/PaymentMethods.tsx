import { useState, useEffect } from 'react';
import {
  paymentMethodService,
  paymentProviderService,
  type PaymentMethod,
  type PaymentProvider,
  type CreatePaymentMethodRequest,
  type CreatePaymentProviderRequest,
} from '../services';

const PaymentMethods = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [editingProvider, setEditingProvider] = useState<PaymentProvider | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'methods' | 'providers'>('methods');

  const [methodFormData, setMethodFormData] = useState<CreatePaymentMethodRequest>({
    name: '',
    code: '',
    providerId: '',
    isActive: true,
    sortOrder: 0,
  });

  const [providerFormData, setProviderFormData] = useState<CreatePaymentProviderRequest>({
    name: '',
    code: '',
    description: '',
    logoUrl: '',
    isActive: true,
    type: 'ONLINE',
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Always fetch providers for dropdown
      const providersResponse = await paymentProviderService.getAllPaymentProviders({ page: 1, limit: 100 });
      setProviders(providersResponse.data || []);
      
      if (activeTab === 'methods') {
        const methodsResponse = await paymentMethodService.getAllPaymentMethods({ page: 1, limit: 100 });
        setMethods(methodsResponse.data || []);
      }
    } catch (err) {
      setError('فشل في جلب البيانات. يرجى المحاولة مرة أخرى.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await paymentMethodService.createPaymentMethod(methodFormData);
      setShowMethodModal(false);
      resetMethodForm();
      fetchData();
    } catch (err) {
      setError('فشل في إنشاء طريقة الدفع. يرجى المحاولة مرة أخرى.');
      console.error('Error creating payment method:', err);
    }
  };

  const handleUpdateMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod) return;
    
    try {
      setError('');
      await paymentMethodService.updatePaymentMethod(editingMethod.id, methodFormData);
      setShowMethodModal(false);
      setEditingMethod(null);
      resetMethodForm();
      fetchData();
    } catch (err) {
      setError('فشل في تحديث طريقة الدفع. يرجى المحاولة مرة أخرى.');
      console.error('Error updating payment method:', err);
    }
  };

  const handleDeleteMethod = async (id: string) => {
    try {
      setError('');
      await paymentMethodService.deletePaymentMethod(id);
      setShowDeleteConfirm(null);
      fetchData();
    } catch (err) {
      setError('فشل في حذف طريقة الدفع. يرجى المحاولة مرة أخرى.');
      console.error('Error deleting payment method:', err);
    }
  };

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await paymentProviderService.createPaymentProvider(providerFormData);
      setShowProviderModal(false);
      resetProviderForm();
      fetchData();
    } catch (err) {
      setError('فشل في إنشاء مزود الدفع. يرجى المحاولة مرة أخرى.');
      console.error('Error creating payment provider:', err);
    }
  };

  const handleUpdateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvider) return;
    
    try {
      setError('');
      await paymentProviderService.updatePaymentProvider(editingProvider.id, providerFormData);
      setShowProviderModal(false);
      setEditingProvider(null);
      resetProviderForm();
      fetchData();
    } catch (err) {
      setError('فشل في تحديث مزود الدفع. يرجى المحاولة مرة أخرى.');
      console.error('Error updating payment provider:', err);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    try {
      setError('');
      await paymentProviderService.deletePaymentProvider(id);
      setShowDeleteConfirm(null);
      fetchData();
    } catch (err) {
      setError('فشل في حذف مزود الدفع. يرجى المحاولة مرة أخرى.');
      console.error('Error deleting payment provider:', err);
    }
  };

  const openEditMethodModal = (method: PaymentMethod) => {
    setEditingMethod(method);
    setMethodFormData({
      name: method.name,
      code: method.code,
      providerId: method.providerId,
      isActive: method.isActive ?? true,
      sortOrder: method.sortOrder || 0,
      requirements: method.requirements || null,
    });
    setShowMethodModal(true);
  };

  const openEditProviderModal = (provider: PaymentProvider) => {
    setEditingProvider(provider);
    setProviderFormData({
      name: provider.name,
      code: provider.code,
      description: provider.description || '',
      logoUrl: provider.logoUrl || '',
      isActive: provider.isActive ?? true,
      type: provider.type || 'ONLINE',
    });
    setShowProviderModal(true);
  };

  const openCreateMethodModal = () => {
    setEditingMethod(null);
    resetMethodForm();
    setShowMethodModal(true);
  };

  const openCreateProviderModal = () => {
    setEditingProvider(null);
    resetProviderForm();
    setShowProviderModal(true);
  };

  const resetMethodForm = () => {
    setMethodFormData({
      name: '',
      code: '',
      providerId: '',
      isActive: true,
      sortOrder: 0,
    });
  };

  const resetProviderForm = () => {
    setProviderFormData({
      name: '',
      code: '',
      description: '',
      logoUrl: '',
      isActive: true,
      type: 'ONLINE',
    });
  };

  const getStatusColor = (isActive: boolean | undefined) => {
    return isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (isActive: boolean | undefined) => {
    return isActive ? 'نشط' : 'غير نشط';
  };

  const stats = {
    totalMethods: methods.length,
    activeMethods: methods.filter(m => m.isActive).length,
    totalProviders: providers.length,
    activeProviders: providers.filter(p => p.isActive).length,
  };

  if (loading && methods.length === 0 && providers.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">طرق الدفع</h1>
          <p className="text-gray-600">إدارة طرق الدفع والمزودين</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('methods')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'methods'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            طرق الدفع
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'providers'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            مزودو الدفع
          </button>
        </div>
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
          <p className="text-gray-600 text-sm mb-1">إجمالي طرق الدفع</p>
          <p className="text-2xl font-bold text-gray-800">{stats.totalMethods}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">طرق الدفع النشطة</p>
          <p className="text-2xl font-bold text-green-600">{stats.activeMethods}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">إجمالي المزودين</p>
          <p className="text-2xl font-bold text-gray-800">{stats.totalProviders}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">المزودين النشطين</p>
          <p className="text-2xl font-bold text-green-600">{stats.activeProviders}</p>
        </div>
      </div>

      {/* Payment Methods Tab */}
      {activeTab === 'methods' && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">طرق الدفع</h2>
            <button
              onClick={openCreateMethodModal}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
            >
              + إضافة طريقة دفع
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : methods.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                <p className="text-lg">لا توجد طرق دفع</p>
                <button
                  onClick={openCreateMethodModal}
                  className="mt-4 text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  إضافة طريقة دفع جديدة
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكود</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المزود</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ترتيب العرض</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {methods
                      .filter(method => !method.is_deleted)
                      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                      .map((method) => (
                      <tr key={method.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{method.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{method.code}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          <div>
                            <div className="font-medium">{method.provider?.name || '-'}</div>
                            {method.provider?.type && (
                              <div className="text-xs text-gray-500">
                                {method.provider.type === 'ONLINE' ? 'أونلاين' : 'أوفلاين'}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {method.sortOrder ?? 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(method.isActive)}`}>
                            {getStatusText(method.isActive)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => openEditMethodModal(method)}
                            className="text-gray-600 hover:text-gray-800 font-semibold mr-4 hover:underline"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(method.id)}
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
        </>
      )}

      {/* Payment Providers Tab */}
      {activeTab === 'providers' && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">مزودو الدفع</h2>
            <button
              onClick={openCreateProviderModal}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
            >
              + إضافة مزود دفع
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : providers.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                <p className="text-lg">لا يوجد مزودي دفع</p>
                <button
                  onClick={openCreateProviderModal}
                  className="mt-4 text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  إضافة مزود دفع جديد
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الشعار</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكود</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">عدد الطرق</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {providers.map((provider) => (
                      <tr key={provider.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {provider.logoUrl ? (
                            <img
                              src={provider.logoUrl}
                              alt={provider.name}
                              className="h-10 w-10 object-contain rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                              لا يوجد
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{provider.name}</div>
                          {provider.description && (
                            <div className="text-sm text-gray-500 mt-1">{provider.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{provider.code}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {provider.type === 'ONLINE' ? 'أونلاين' : 'أوفلاين'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {provider._count?.methods || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(provider.isActive)}`}>
                            {getStatusText(provider.isActive)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => openEditProviderModal(provider)}
                            className="text-gray-600 hover:text-gray-800 font-semibold mr-4 hover:underline"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(provider.id)}
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
        </>
      )}

      {/* Create/Edit Payment Method Modal */}
      {showMethodModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingMethod ? 'تعديل طريقة دفع' : 'إضافة طريقة دفع جديدة'}
              </h2>
            </div>
            <form onSubmit={editingMethod ? handleUpdateMethod : handleCreateMethod} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم *</label>
                <input
                  type="text"
                  value={methodFormData.name}
                  onChange={(e) => setMethodFormData({ ...methodFormData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الكود *</label>
                <input
                  type="text"
                  value={methodFormData.code}
                  onChange={(e) => setMethodFormData({ ...methodFormData, code: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">المزود *</label>
                <select
                  value={methodFormData.providerId}
                  onChange={(e) => setMethodFormData({ ...methodFormData, providerId: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="">اختر المزود</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ترتيب العرض</label>
                <input
                  type="number"
                  value={methodFormData.sortOrder}
                  onChange={(e) => setMethodFormData({ ...methodFormData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">يتم ترتيب طرق الدفع حسب هذا الرقم (الأقل أولاً)</p>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={methodFormData.isActive}
                    onChange={(e) => setMethodFormData({ ...methodFormData, isActive: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">نشط</span>
                </label>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  {editingMethod ? 'تحديث' : 'إنشاء'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMethodModal(false);
                    setEditingMethod(null);
                    resetMethodForm();
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

      {/* Create/Edit Payment Provider Modal */}
      {showProviderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingProvider ? 'تعديل مزود دفع' : 'إضافة مزود دفع جديد'}
              </h2>
            </div>
            <form onSubmit={editingProvider ? handleUpdateProvider : handleCreateProvider} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم *</label>
                <input
                  type="text"
                  value={providerFormData.name}
                  onChange={(e) => setProviderFormData({ ...providerFormData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الكود *</label>
                <input
                  type="text"
                  value={providerFormData.code}
                  onChange={(e) => setProviderFormData({ ...providerFormData, code: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الوصف</label>
                <textarea
                  value={providerFormData.description}
                  onChange={(e) => setProviderFormData({ ...providerFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">رابط الشعار</label>
                <input
                  type="url"
                  value={providerFormData.logoUrl}
                  onChange={(e) => setProviderFormData({ ...providerFormData, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">النوع</label>
                <select
                  value={providerFormData.type}
                  onChange={(e) => setProviderFormData({ ...providerFormData, type: e.target.value as 'ONLINE' | 'OFFLINE' })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="ONLINE">أونلاين</option>
                  <option value="OFFLINE">أوفلاين</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={providerFormData.isActive}
                    onChange={(e) => setProviderFormData({ ...providerFormData, isActive: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">نشط</span>
                </label>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  {editingProvider ? 'تحديث' : 'إنشاء'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProviderModal(false);
                    setEditingProvider(null);
                    resetProviderForm();
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
            <p className="text-gray-600 mb-6">هل أنت متأكد من الحذف؟</p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  if (activeTab === 'methods') {
                    handleDeleteMethod(showDeleteConfirm);
                  } else {
                    handleDeleteProvider(showDeleteConfirm);
                  }
                }}
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

export default PaymentMethods;
