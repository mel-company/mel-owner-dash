import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import type { IconSvgElement } from '@hugeicons/react';
import {
  Alert02Icon,
  AnalyticsUpIcon,
  ArrowReloadHorizontalIcon,
  ChartHistogramIcon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  CustomerSupportIcon,
  DashboardSquare03Icon,
  Globe02Icon,
  Invoice03Icon,
  Package01Icon,
  PieChartIcon,
  StoreManagement01Icon,
  UserGroupIcon,
  Wallet02Icon,
} from '@hugeicons-pro/core-stroke-rounded';
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
import { cn } from '@/lib/utils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

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
      setRefreshing(false);
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
      pointBackgroundColor: '#7D26F7',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
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
      borderSkipped: false,
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
      hoverOffset: 8,
    }],
  }), [storeMetrics]);

  const featureAdoption = (featuresData.storesUsingCoupons || 0)
    + (featuresData.storesUsingDeliveryIntegration || 0)
    + (featuresData.storesUsingOnlinePayments || 0);

  const riskCount = (riskData.storesWithExpiredSubscriptions?.length || 0)
    + (riskData.storesWithHighRefunds?.length || 0);

  if (loading) return <LoadingState />;

  return (
    <div className="min-h-screen space-y-5 bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="لوحة التحكم"
        description={<>أهلاً <span className="font-black text-violet-600">{user?.name || 'بك'}</span>، هذه نظرة شاملة على أداء المنصة</>}
        icon={<HugeiconsIcon icon={DashboardSquare03Icon} size={24} strokeWidth={2.2} />}
        action={(
          <PrimaryActionButton onClick={() => fetchDashboardData(true)}>
            تحديث البيانات
            <HugeiconsIcon
              icon={ArrowReloadHorizontalIcon}
              size={18}
              strokeWidth={2.2}
              className={cn(refreshing && 'animate-spin')}
            />
          </PrimaryActionButton>
        )}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="إجمالي المتاجر"
          value={(storeMetrics.totalStores || 0).toLocaleString('en-US')}
          icon={<HugeiconsIcon icon={StoreManagement01Icon} size={24} strokeWidth={2.2} />}
          tone="blue"
        />
        <StatCard
          title="المتاجر النشطة"
          value={(storeMetrics.activeStores || 0).toLocaleString('en-US')}
          icon={<HugeiconsIcon icon={UserGroupIcon} size={24} strokeWidth={2.2} />}
          tone="teal"
        />
        <StatCard
          title="إجمالي الإيرادات"
          value={formatMoney(kpis.total_revenue)}
          icon={<HugeiconsIcon icon={Wallet02Icon} size={24} strokeWidth={2.2} />}
          tone="violet"
        />
        <StatCard
          title="إجمالي الطلبات"
          value={(ordersData.totalOrders || 0).toLocaleString('en-US')}
          icon={<HugeiconsIcon icon={Invoice03Icon} size={24} strokeWidth={2.2} />}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.55fr_1fr]">
        <ChartCard
          title="الإيرادات"
          subtitle="اليوم، الشهر، والإجمالي"
          icon={ChartLineData01Icon}
        >
          <Line data={revenueSeries} options={chartOptions} />
        </ChartCard>
        <ChartCard
          title="حالة المتاجر"
          subtitle="مؤشرات تحتاج متابعة"
          icon={PieChartIcon}
        >
          <Doughnut data={storeSeries} options={doughnutOptions} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard
          title="استخدام الطلبات"
          subtitle="أداء الدفع والطلبات"
          icon={ChartHistogramIcon}
        >
          <Bar data={ordersSeries} options={chartOptions} />
        </ChartCard>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            title="تذاكر مفتوحة"
            value={(adminData.ticketsOpened || 0).toLocaleString('en-US')}
            icon={<HugeiconsIcon icon={CustomerSupportIcon} size={24} strokeWidth={2.2} />}
            tone="cyan"
          />
          <StatCard
            title="تذاكر محلولة"
            value={(adminData.ticketsResolved || 0).toLocaleString('en-US')}
            icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} strokeWidth={2.2} />}
            tone="emerald"
          />
          <StatCard
            title="متاجر بهبوط طلبات"
            value={(riskData.storesWithDropInOrders?.length || 0).toLocaleString('en-US')}
            icon={<HugeiconsIcon icon={Package01Icon} size={24} strokeWidth={2.2} />}
            tone="amber"
          />
          <StatCard
            title="مخاطر تحتاج متابعة"
            value={riskCount.toLocaleString('en-US')}
            icon={<HugeiconsIcon icon={Alert02Icon} size={24} strokeWidth={2.2} />}
            tone="rose"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <InsightCard
          title="إيرادات اليوم"
          value={formatMoney(kpis.revenue_today)}
          icon={AnalyticsUpIcon}
          tone="violet"
        />
        <InsightCard
          title="إيرادات الشهر"
          value={formatMoney(kpis.revenue_this_month)}
          icon={Wallet02Icon}
          tone="blue"
        />
        <InsightCard
          title="متوسط إيراد المتجر"
          value={formatMoney(kpis.average_revenue_per_store)}
          icon={StoreManagement01Icon}
          tone="teal"
        />
      </div>

      <TableShell>
        <table className="w-full min-w-225">
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
              {
                label: 'معدل نجاح الطلبات',
                value: `${ordersData.orderSuccessRate?.toFixed(1) || 0}%`,
                tone: 'green' as const,
                note: 'الأداء الحالي جيد',
                icon: CheckmarkCircle02Icon,
              },
              {
                label: 'المتاجر بدون منتجات',
                value: storeMetrics.storesWithoutProducts || 0,
                tone: 'amber' as const,
                note: 'تحتاج متابعة تشغيلية',
                icon: Package01Icon,
              },
              {
                label: 'الدول النشطة',
                value: geographyData.ordersByCountry?.length || 0,
                tone: 'blue' as const,
                note: 'إشارات السوق الجغرافية',
                icon: Globe02Icon,
              },
              {
                label: 'تبني الميزات',
                value: featureAdoption,
                tone: 'violet' as const,
                note: 'استخدام مميزات المنصة',
                icon: AnalyticsUpIcon,
              },
            ].map((row) => (
              <tr key={row.label} className="text-sm text-slate-700 transition hover:bg-slate-50/70">
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-3">
                    <span className="font-black text-slate-950">{row.label}</span>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
                      <HugeiconsIcon icon={row.icon} size={18} strokeWidth={2.2} />
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 font-semibold text-slate-600">{row.value}</td>
                <td className="px-5 py-4">
                  <StatusPill tone={row.tone}>{row.tone === 'green' ? 'مستقر' : 'متابعة'}</StatusPill>
                </td>
                <td className="px-5 py-4 text-slate-500">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
};

const ChartCard = ({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: IconSvgElement;
  children: ReactNode;
}) => (
  <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-violet-600">
        <HugeiconsIcon icon={icon} size={22} strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1 text-right">
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        <p className="text-sm font-semibold text-slate-400">{subtitle}</p>
      </div>
    </div>
    <div className="h-80">{children}</div>
  </div>
);

const InsightCard = ({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: IconSvgElement;
  tone: 'violet' | 'blue' | 'teal';
}) => {
  const tones = {
    violet: 'bg-violet-50 text-violet-600',
    blue: 'bg-blue-50 text-blue-600',
    teal: 'bg-teal-50 text-teal-600',
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.7rem] bg-white px-5 py-5 shadow-sm ring-1 ring-slate-100">
      <div className={cn('grid h-12 w-12 place-items-center rounded-2xl', tones[tone])}>
        <HugeiconsIcon icon={icon} size={24} strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1 text-right">
        <p className="text-sm font-bold text-slate-400">{title}</p>
        <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
      </div>
    </div>
  );
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { weight: 700 as const } } },
    y: { grid: { color: 'rgba(148,163,184,0.16)' }, ticks: { font: { weight: 600 as const } } },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        boxWidth: 12,
        boxHeight: 12,
        usePointStyle: true,
        padding: 18,
        font: { weight: 700 as const },
      },
    },
  },
};

const formatMoney = (value?: number) => (value ? `${value.toLocaleString('en-US')} د.ع` : '0 د.ع');

export default Dashboard;
