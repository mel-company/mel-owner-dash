import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { plansService, type Plan } from '../services/plansService';
import { systemSubscriptionsService, type Subscription } from '../services/systemSubscriptionsService';

const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch plans and subscriptions in parallel
      const [plansResponse, subscriptionsResponse] = await Promise.all([
        plansService.getAllPlans({ page: 1, limit: 100 }),
        systemSubscriptionsService.getAllSubscriptions(),
      ]);
      
      setPlans(plansResponse.data || []);
      setSubscriptions(subscriptionsResponse || []);
    } catch (err) {
      setError('فشل في جلب البيانات. يرجى المحاولة مرة أخرى.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPlanColor = (planName: string) => {
    const colors: { [key: string]: string } = {
      'Premium': 'bg-purple-500',
      'Pro': 'bg-blue-500',
      'Pro Max': 'bg-indigo-500',
      'Go': 'bg-green-500',
      'Basic': 'bg-gray-500',
    };
    return colors[planName] || 'bg-gray-500';
  };

  const getSubscriptionColor = (planName: string | undefined) => {
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

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    const statusMap: { [key: string]: string } = {
      'ACTIVE': 'bg-green-100 text-green-700',
      'CANCELLED': 'bg-red-100 text-red-700',
      'EXPIRED': 'bg-red-100 text-red-700',
      'PAUSED': 'bg-yellow-100 text-yellow-700',
    };
    return statusMap[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (status: string | undefined) => {
    if (!status) return 'بدون اشتراك';
    const statusMap: { [key: string]: string } = {
      'ACTIVE': 'نشط',
      'CANCELLED': 'ملغى',
      'EXPIRED': 'منتهي',
      'PAUSED': 'متوقف',
    };
    return statusMap[status] || status;
  };

  if (loading && plans.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">خطط الاشتراكات</h1>
          <p className="text-gray-600">إدارة الخطط والاشتراكات</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Plans Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : plans.length === 0 ? (
          <div className="col-span-3 text-center p-8 text-gray-500">
            <p className="text-lg">لا توجد خطط متاحة</p>
          </div>
        ) : (
          plans.map((plan) => {
            const activeSubscriptions = subscriptions.filter(
              sub => sub.planId === plan.id && sub.status === 'ACTIVE'
            ).length;

            return (
              <div
                key={plan.id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition"
              >
                <div className={`${getPlanColor(plan.name)} w-16 h-16 rounded-lg flex items-center justify-center text-white text-2xl font-bold mb-4`}>
                  {plan.name.charAt(0)}
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">
                    {plan.monthly_price?.toLocaleString('ar-IQ') || 0}
                  </span>
                  <span className="text-gray-600 mr-2">د.ع / شهري</span>
                </div>
                {plan.yearly_price && (
                  <div className="mb-4">
                    <span className="text-xl font-bold text-gray-900">
                      {plan.yearly_price.toLocaleString('ar-IQ')}
                    </span>
                    <span className="text-gray-600 mr-2">د.ع / سنوي</span>
                  </div>
                )}
                <ul className="space-y-2 mb-6">
                  {plan.features && plan.features.length > 0 ? (
                    plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-gray-600">
                        <span className="text-green-500">✓</span>
                        <span>{feature.name || (feature as unknown as string)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500">لا توجد ميزات محددة</li>
                  )}
                </ul>
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">المتاجر النشطة</p>
                  <p className="text-xl font-bold text-gray-800">{activeSubscriptions}</p>
                </div>
                {plan.most_popular && (
                  <div className="mt-4">
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                      الأكثر شعبية
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Active Subscriptions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">الاشتراكات</h2>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <p className="text-lg">لا توجد اشتراكات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{sub.store?.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSubscriptionColor(sub.plan?.name)}`}>
                        {sub.plan?.name || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {sub.start_at ? new Date(sub.start_at).toLocaleDateString('ar-IQ') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {sub.end_at ? new Date(sub.end_at).toLocaleDateString('ar-IQ') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(sub.status)}`}>
                        {getStatusText(sub.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => navigate(`/dashboard/stores/${sub.storeId}`)}
                        className="text-blue-600 hover:text-blue-800 mr-4 hover:underline"
                      >
                        عرض
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPlans;
