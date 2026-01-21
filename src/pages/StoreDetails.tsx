import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { systemStoresService, type Store } from '../services/systemStoresService';

const StoreDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchStoreDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchStoreDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError('');
      const storeData = await systemStoresService.getStoreById(id);
      setStore(storeData);
    } catch (err) {
      setError('فشل في جلب تفاصيل المتجر. يرجى المحاولة مرة أخرى.');
      console.error('Error fetching store details:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionColor = (planName: string | null | undefined) => {
    if (!planName) return 'bg-gray-100 text-gray-700';
    const colors: { [key: string]: string } = {
      'Premium': 'bg-purple-100 text-purple-700',
      'Pro': 'bg-blue-100 text-blue-700',
      'Pro Max': 'bg-indigo-100 text-indigo-700',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{error || 'المتجر غير موجود'}</span>
        </div>
        <button
          onClick={() => navigate('/dashboard/stores')}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all font-semibold"
        >
          العودة إلى المتاجر
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <button
            onClick={() => navigate('/dashboard/stores')}
            className="text-indigo-600 hover:text-indigo-700 font-semibold mb-4 flex items-center gap-2"
          >
            ← العودة إلى المتاجر
          </button>
          <div className="flex items-center gap-6">
            {store.logo && (
                <div className="shrink-0">
                <img
                  src={store.logo}
                  alt={store.name}
                  className="w-24 h-24 rounded-xl object-cover border-2 border-gray-200 shadow-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{store.name}</h1>
              <p className="text-gray-600">تفاصيل المتجر الكاملة</p>
            </div>
          </div>
        </div>
      </div>

      {/* Store Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">المعلومات الأساسية</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 mb-1">اسم المتجر</p>
              <p className="font-semibold text-gray-800">{store.name}</p>
            </div>
            {store.description && (
              <div>
                <p className="text-sm text-gray-600 mb-1">الوصف</p>
                <p className="font-semibold text-gray-800">{store.description}</p>
              </div>
            )}
            {store.location && (
              <div>
                <p className="text-sm text-gray-600 mb-1">الموقع</p>
                <p className="font-semibold text-gray-800">{store.location}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600 mb-1">نوع المتجر</p>
              <p className="font-semibold text-gray-800">
                {store.store_type === 'ECOMMERCE' ? 'متجر إلكتروني' : store.store_type || 'غير محدد'}
              </p>
            </div>
            {store.domain && (
              <div>
                <p className="text-sm text-gray-600 mb-1">النطاق</p>
                <a
                  href={`https://${store.domain}.mel.iq`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  {store.domain}.mel.iq
                </a>
              </div>
            )}
            {store.logo && (
              <div>
                <p className="text-sm text-gray-600 mb-1">الشعار</p>
                <img
                  src={store.logo}
                  alt={`${store.name} logo`}
                  className="w-32 h-32 rounded-lg object-cover border border-gray-200 shadow"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Owner Information */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">معلومات المالك</h2>
          <div className="space-y-3">
            {store.owner ? (
              <>
                <div>
                  <p className="text-sm text-gray-600 mb-1">اسم المالك</p>
                  <p className="font-semibold text-gray-800">{store.owner.name}</p>
                </div>
                {store.owner.email && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">البريد الإلكتروني</p>
                    <p className="font-semibold text-gray-800">{store.owner.email}</p>
                  </div>
                )}
                {store.owner.phone && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">الهاتف</p>
                    <p className="font-semibold text-gray-800">{store.owner.phone}</p>
                  </div>
                )}
                {store.owner.location && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">الموقع</p>
                    <p className="font-semibold text-gray-800">{store.owner.location}</p>
                  </div>
                )}
              </>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-1">البريد الإلكتروني</p>
                <p className="font-semibold text-gray-800">{store.email || 'غير محدد'}</p>
              </div>
            )}
            {store.phone && !store.owner?.phone && (
              <div>
                <p className="text-sm text-gray-600 mb-1">هاتف المتجر</p>
                <p className="font-semibold text-gray-800">{store.phone}</p>
              </div>
            )}
            {store.ownerId && (
              <div>
                <p className="text-sm text-gray-600 mb-1">معرف المالك</p>
                <p className="font-semibold text-gray-800 text-xs font-mono">{store.ownerId}</p>
              </div>
            )}
          </div>
        </div>

        {/* Subscription Information */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">معلومات الاشتراك</h2>
          {store.subscription ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">الخطة</p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSubscriptionColor(store.subscription.plan.name)}`}>
                  {store.subscription.plan.name}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">وصف الخطة</p>
                <p className="font-semibold text-gray-800">{store.subscription.plan.description}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">الحالة</p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(store.subscription.status)}`}>
                  {getStatusText(store.subscription.status)}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">تاريخ البدء</p>
                <p className="font-semibold text-gray-800">
                  {new Date(store.subscription.start_at).toLocaleDateString('ar-IQ')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">تاريخ الانتهاء</p>
                <p className="font-semibold text-gray-800">
                  {new Date(store.subscription.end_at).toLocaleDateString('ar-IQ')}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">لا يوجد اشتراك نشط</p>
          )}
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">معلومات إضافية</h2>
          <div className="space-y-3">
            {store.currency && (
              <div>
                <p className="text-sm text-gray-600 mb-1">العملة</p>
                <p className="font-semibold text-gray-800">{store.currency}</p>
              </div>
            )}
            {store.language && (
              <div>
                <p className="text-sm text-gray-600 mb-1">اللغة</p>
                <p className="font-semibold text-gray-800">{store.language}</p>
              </div>
            )}
            {store.timezone && (
              <div>
                <p className="text-sm text-gray-600 mb-1">المنطقة الزمنية</p>
                <p className="font-semibold text-gray-800">{store.timezone}</p>
              </div>
            )}
            {store.deliveryCompanyId && (
              <div>
                <p className="text-sm text-gray-600 mb-1">شركة التوصيل</p>
                <p className="font-semibold text-gray-800 text-xs font-mono">{store.deliveryCompanyId}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600 mb-1">تاريخ الإنشاء</p>
              <p className="font-semibold text-gray-800">
                {new Date(store.createdAt).toLocaleDateString('ar-IQ')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">آخر تحديث</p>
              <p className="font-semibold text-gray-800">
                {new Date(store.updatedAt).toLocaleDateString('ar-IQ')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Social Media Links */}
      {(store.instagram || store.facebook || store.tiktok || store.x) && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">روابط وسائل التواصل الاجتماعي</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {store.instagram && (
              <a
                href={store.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-pink-600 hover:text-pink-700 font-semibold"
              >
                <span>📷</span>
                <span>Instagram</span>
              </a>
            )}
            {store.facebook && (
              <a
                href={store.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
              >
                <span>👥</span>
                <span>Facebook</span>
              </a>
            )}
            {store.tiktok && (
              <a
                href={store.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-800 hover:text-gray-900 font-semibold"
              >
                <span>🎵</span>
                <span>TikTok</span>
              </a>
            )}
            {store.x && (
              <a
                href={store.x}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-800 hover:text-gray-900 font-semibold"
              >
                <span>𝕏</span>
                <span>X (Twitter)</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreDetails;
