import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { plansService, type Plan, type PlanFeature } from '../services/plansService';
import { systemSubscriptionsService, type Subscription } from '../services/systemSubscriptionsService';
import { renderText } from '@/utils/renderText';

export const SubscriptionPlans = () => {
  const navigate = useNavigate();

    const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [plansRes, subsRes] = await Promise.all([
        plansService.getAllPlans({ page: 1, limit: 100 }),
        systemSubscriptionsService.getAllSubscriptions(),
      ]);

      setPlans(plansRes.data || []);
      setSubscriptions(subsRes || []);
    } catch (e) {
      console.error(e);
      setError('فشل في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-10 w-10 border-b-2 border-indigo-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">خطط الاشتراك</h1>
        <p className="text-gray-500">إدارة الخطط والاشتراكات</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white p-6 rounded-xl shadow"
          >
            <h2 className="text-xl font-bold mb-2">
              {renderText(plan.name)}
            </h2>

            <p className="text-gray-600 mb-4">
              {renderText(plan.description)}
            </p>

            <div className="mb-4">
              <span className="text-2xl font-bold">
                {plan.monthly_price?.toLocaleString('ar-IQ') || 0}
              </span>
              <span className="text-gray-500 mr-2">د.ع / شهري</span>
            </div>

            {/* Features */}
            <ul className="space-y-2">
              {Array.isArray(plan.features) && plan.features.length > 0 ? (
                plan.features.map((features: PlanFeature) => (
                  <li key={features.id} className="flex gap-2">
                    <span className="text-green-600">✓</span>
                    <span>{renderText(features.description)}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-400">لا توجد ميزات</li>
              )}
            </ul>
          </div>
        ))}
      </div>

      {/* Subscriptions */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">الاشتراكات</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">المتجر</th>
                <th className="p-3 text-right">الخطة</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="border-t">
                  <td className="p-3">
                    {renderText(sub.store)}
                  </td>
                  <td className="p-3">
                    {renderText(sub.plan)}
                  </td>
                  <td className="p-3">
                    {sub.status}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() =>
                        navigate(`/dashboard/stores/${sub.storeId}`)
                      }
                      className="text-blue-600 hover:underline"
                    >
                      عرض
                    </button>
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
