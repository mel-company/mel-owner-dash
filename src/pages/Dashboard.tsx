import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  DollarSign,
  FileText,
  HelpCircle,
  Package,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  ownerStatsService,
  type AdminProductivity,
  type FeaturesAdoption,
  type GeographyMarketSignals,
  type KeyKPIs,
  type OrdersPlatformUsage,
  type RiskAttention,
  type StoreMetrics,
} from '../services/ownerStatsService';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState, PageHeader, PrimaryActionButton, StatCard, StatusPill, TableShell } from '@/components/dashboard';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KeyKPIs>({});
  const [storeMetrics, setStoreMetrics] = useState<StoreMetrics>({});
  const [ordersData, setOrdersData] = useState<OrdersPlatformUsage>({});
  const [featuresData, setFeaturesData] = useState<FeaturesAdoption>({});
  const [riskData, setRiskData] = useState<RiskAttention>({});
  const [geographyData, setGeographyData] = useState<GeographyMarketSignals>({});
  const [adminData, setAdminData] = useState<AdminProductivity>({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [kpisData, storeMetricsData, orders, features, risks, geography, admin] = await Promise.all([
        ownerStatsService.getKeyKPIs(),
        ownerStatsService.getStoreMetrics(),
        ownerStatsService.getOrdersPlatformUsage(),
        ownerStatsService.getFeaturesAdoption(),
        ownerStatsService.getRiskAttention(),
        ownerStatsService.getGeographyMarketSignals(),
        ownerStatsService.getAdminProductivity(),
      ]);
      setKpis(kpisData);
      setStoreMetrics(storeMetricsData);
      setOrdersData(orders);
      setFeaturesData(features);
      setRiskData(risks);
      setGeographyData(geography);
      setAdminData(admin);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const revenueSeries = useMemo(() => ({
    labels: ['اليوم', 'هذا الشهر', 'الإجمالي'],
    datasets: [{
      label: 'الإيرادات',
      data: [kpis.revenue_today || 0, kpis.revenue_this_month || 0, kpis.total_revenue || 0],
      borderColor: '#7D26F7',
      backgroundColor: 'rgba(125,38,247,0.12)',
      fill: true,
      tension: 0.4,
    }],
  }), [kpis]);

  const ordersSeries = useMemo(() => ({
    labels: ['اليوم', 'آخر 7 أيام', 'ناجحة', 'فاشلة', 'ملغاة'],
    datasets: [{
      label: 'الطلبات',
      data: [
        ordersData.ordersToday || 0,
        ordersData.ordersLast7Days || 0,
        ordersData.paymentSuccessCount || 0,
        ordersData.paymentFailureCount || 0,
        ordersData.cancelledOrders || 0,
      ],
      backgroundColor: ['#38bdf8', '#7c3aed', '#10b981', '#ef4444', '#f97316'],
      borderRadius: 12,
    }],
  }), [ordersData]);

  const storeSeries = useMemo(() => ({
    labels: ['نشطة', 'بدون منتجات', 'بدون طلبات'],
    datasets: [{
      data: [
        storeMetrics.activeStores || 0,
        storeMetrics.storesWithoutProducts || 0,
        storeMetrics.storesWithoutOrders || 0,
      ],
      backgroundColor: ['#10b981', '#f97316', '#ef4444'],
      borderWidth: 0,
    }],
  }), [storeMetrics]);

  if (loading) return <LoadingState />;

  return (
    <div className="min-h-screen space-y-5 bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="لوحة التحكم"
        description={<>أهلاً {user?.name || 'بك'}، هذه نظرة شاملة على أداء المنصة</>}
        icon={<BarChart3 className="h-6 w-6" />}
        action={<PrimaryActionButton>تحديث البيانات<TrendingUp className="h-4 w-4" /></PrimaryActionButton>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="إجمالي المتاجر" value={storeMetrics.totalStores || 0} icon={<Store />} tone="blue" />
        <StatCard title="المتاجر النشطة" value={storeMetrics.activeStores || 0} icon={<Users />} tone="teal" />
        <StatCard title="إجمالي الإيرادات" value={formatMoney(kpis.total_revenue)} icon={<Wallet />} tone="violet" />
        <StatCard title="إجمالي الطلبات" value={ordersData.totalOrders || 0} icon={<FileText />} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
        <ChartCard title="الإيرادات" subtitle="اليوم، الشهر، والإجمالي">
          <Line data={revenueSeries} options={chartOptions} />
        </ChartCard>
        <ChartCard title="حالة المتاجر" subtitle="مؤشرات تحتاج متابعة">
          <Doughnut data={storeSeries} options={doughnutOptions} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title="استخدام الطلبات" subtitle="أداء الدفع والطلبات">
          <Bar data={ordersSeries} options={chartOptions} />
        </ChartCard>
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <StatCard title="تذاكر مفتوحة" value={adminData.ticketsOpened || 0} icon={<HelpCircle />} tone="cyan" />
            <StatCard title="تذاكر محلولة" value={adminData.ticketsResolved || 0} icon={<CheckCircle />} tone="emerald" />
            <StatCard title="متاجر بهبوط طلبات" value={riskData.storesWithDropInOrders?.length || 0} icon={<Package />} tone="amber" />
            <StatCard title="مخاطر تحتاج متابعة" value={(riskData.storesWithExpiredSubscriptions?.length || 0) + (riskData.storesWithHighRefunds?.length || 0)} icon={<AlertTriangle />} tone="rose" />
          </div>
        </div>
      </div>

      <TableShell>
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
              <th className="px-5 py-5 text-right">المؤشر</th>
              <th className="px-5 py-5 text-right">القيمة</th>
              <th className="px-5 py-5 text-right">الحالة</th>
              <th className="px-5 py-5 text-right">ملاحظة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              ['معدل نجاح الطلبات', `${ordersData.orderSuccessRate?.toFixed(1) || 0}%`, 'green', 'الأداء الحالي جيد'],
              ['المتاجر بدون منتجات', storeMetrics.storesWithoutProducts || 0, 'amber', 'تحتاج متابعة تشغيلية'],
              ['الدول النشطة', geographyData.ordersByCountry?.length || 0, 'blue', 'إشارات السوق الجغرافية'],
              ['تبني الميزات', (featuresData.storesUsingCoupons || 0) + (featuresData.storesUsingDeliveryIntegration || 0) + (featuresData.storesUsingOnlinePayments || 0), 'violet', 'استخدام مميزات المنصة'],
            ].map(([label, value, tone, note]) => (
              <tr key={String(label)} className="text-sm text-slate-700 transition hover:bg-slate-50/70">
                <td className="px-5 py-4 font-black text-slate-950">{label}</td>
                <td className="px-5 py-4 font-semibold text-slate-600">{value}</td>
                <td className="px-5 py-4"><StatusPill tone={tone as 'green' | 'amber' | 'blue' | 'violet'}>{tone === 'green' ? 'مستقر' : 'متابعة'}</StatusPill></td>
                <td className="px-5 py-4 text-slate-500">{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
};

const ChartCard = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
  <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
    <div className="mb-5 flex items-center justify-between">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-50 text-violet-600">
        <DollarSign className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        <p className="text-sm font-semibold text-slate-400">{subtitle}</p>
      </div>
    </div>
    <div className="h-[320px]">{children}</div>
  </div>
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: 'rgba(148,163,184,0.16)' } },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
    },
  },
};

const formatMoney = (value?: number) => value ? `${value.toLocaleString('en-US')} د.ع` : '0 د.ع';

export default Dashboard;
