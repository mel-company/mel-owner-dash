import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
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
import { PageHeader, PrimaryActionButton, StatusPill, TableShell } from '@/components/dashboard';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const Dashboard = () => {
  const { user } = useAuth();

  if (user?.role === 'developer') {
    return <Navigate to="/dashboard/developer" replace />;
  }
  if (user?.role === 'support') {
    return <Navigate to="/dashboard/support" replace />;
  }

  return <OwnerDashboard />;
};

const OwnerDashboard = () => {
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

  const revenueOption = useMemo<EChartsOption>(() => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      textStyle: { fontFamily: 'Setar XS, sans-serif' },
    },
    grid: { left: 16, right: 16, top: 24, bottom: 32, containLabel: true },
    xAxis: {
      type: 'category',
      data: ['اليوم', 'هذا الشهر', 'الإجمالي'],
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontWeight: 700, fontFamily: 'Setar XS, sans-serif' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } },
      axisLabel: { color: '#64748b', fontWeight: 600, fontFamily: 'Setar XS, sans-serif' },
    },
    series: [{
      name: 'الإيرادات',
      type: 'bar',
      barMaxWidth: 48,
      data: [
        { value: kpis.revenue_today || 0, itemStyle: { color: '#a78bfa', borderRadius: [12, 12, 0, 0] } },
        { value: kpis.revenue_this_month || 0, itemStyle: { color: '#7c3aed', borderRadius: [12, 12, 0, 0] } },
        { value: kpis.total_revenue || 0, itemStyle: { color: '#5b21b6', borderRadius: [12, 12, 0, 0] } },
      ],
    }],
  }), [kpis]);

  const ordersOption = useMemo<EChartsOption>(() => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      textStyle: { fontFamily: 'Setar XS, sans-serif' },
    },
    grid: { left: 16, right: 16, top: 24, bottom: 32, containLabel: true },
    xAxis: {
      type: 'category',
      data: ['اليوم', 'آخر 7 أيام', 'ناجحة', 'فاشلة', 'ملغاة'],
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontWeight: 700, fontFamily: 'Setar XS, sans-serif' },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } },
      axisLabel: { color: '#64748b', fontWeight: 600, fontFamily: 'Setar XS, sans-serif' },
    },
    series: [{
      name: 'الطلبات',
      type: 'bar',
      barMaxWidth: 40,
      data: [
        { value: ordersData.ordersToday || 0, itemStyle: { color: '#38bdf8', borderRadius: [12, 12, 0, 0] } },
        { value: ordersData.ordersLast7Days || 0, itemStyle: { color: '#7c3aed', borderRadius: [12, 12, 0, 0] } },
        { value: ordersData.paymentSuccessCount || 0, itemStyle: { color: '#10b981', borderRadius: [12, 12, 0, 0] } },
        { value: ordersData.paymentFailureCount || 0, itemStyle: { color: '#ef4444', borderRadius: [12, 12, 0, 0] } },
        { value: ordersData.cancelledOrders || 0, itemStyle: { color: '#f97316', borderRadius: [12, 12, 0, 0] } },
      ],
    }],
  }), [ordersData]);

  const storeOption = useMemo<EChartsOption>(() => {
    const rows = [
      { name: 'نشطة', value: storeMetrics.activeStores || 0, color: '#10b981' },
      { name: 'بدون منتجات', value: storeMetrics.storesWithoutProducts || 0, color: '#f97316' },
      { name: 'بدون طلبات', value: storeMetrics.storesWithoutOrders || 0, color: '#ef4444' },
    ];
    const hasData = rows.some((row) => row.value > 0);

    return {
      tooltip: {
        trigger: 'item',
        textStyle: { fontFamily: 'Setar XS, sans-serif' },
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        textStyle: { color: '#64748b', fontWeight: 700, fontFamily: 'Setar XS, sans-serif' },
      },
      series: [{
        name: 'حالة المتاجر',
        type: 'pie',
        radius: ['58%', '78%'],
        center: ['50%', '46%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: hasData
          ? rows.map((row) => ({ name: row.name, value: row.value, itemStyle: { color: row.color } }))
          : [{ name: 'لا بيانات', value: 1, itemStyle: { color: '#e2e8f0' } }],
      }],
    };
  }, [storeMetrics]);

  const revenueTotal =
    (kpis.revenue_today || 0) + (kpis.revenue_this_month || 0) + (kpis.total_revenue || 0);
  const ordersTotal =
    (ordersData.ordersToday || 0)
    + (ordersData.ordersLast7Days || 0)
    + (ordersData.paymentSuccessCount || 0)
    + (ordersData.paymentFailureCount || 0)
    + (ordersData.cancelledOrders || 0);
  const storesEmpty = !(
    (storeMetrics.activeStores || 0)
    + (storeMetrics.storesWithoutProducts || 0)
    + (storeMetrics.storesWithoutOrders || 0)
  );

  const featureAdoption = (featuresData.storesUsingCoupons || 0)
    + (featuresData.storesUsingDeliveryIntegration || 0)
    + (featuresData.storesUsingOnlinePayments || 0);

  const riskCount = (riskData.storesWithExpiredSubscriptions?.length || 0)
    + (riskData.storesWithHighRefunds?.length || 0);

  const activeShare = storeMetrics.totalStores
    ? Math.round(((storeMetrics.activeStores || 0) / storeMetrics.totalStores) * 100)
    : null;

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="page-shell bg-[#f8fafc] text-right" dir="rtl">
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="إجمالي المتاجر"
          description="كل المتاجر على المنصة"
          value={(storeMetrics.totalStores || 0).toLocaleString('en-US')}
          icon={StoreManagement01Icon}
        />
        <KpiCard
          title="المتاجر النشطة"
          description="متاجر لديها نشاط حديث"
          value={(storeMetrics.activeStores || 0).toLocaleString('en-US')}
          icon={UserGroupIcon}
          badge={activeShare != null ? `${activeShare}% نشط` : undefined}
          badgeVariant="secondary"
        />
        <KpiCard
          title="إجمالي الإيرادات"
          description={`اليوم ${formatMoney(kpis.revenue_today)} · الشهر ${formatMoney(kpis.revenue_this_month)}`}
          value={formatMoney(kpis.total_revenue)}
          icon={Wallet02Icon}
          accent
        />
        <KpiCard
          title="إجمالي الطلبات"
          description="كل الطلبات المسجّلة"
          value={(ordersData.totalOrders || 0).toLocaleString('en-US')}
          icon={Invoice03Icon}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
        <ChartPanel
          title="الإيرادات"
          description="مقارنة إيراد اليوم والشهر والإجمالي"
          icon={ChartHistogramIcon}
          empty={revenueTotal === 0}
          emptyText="لا توجد إيرادات مسجّلة بعد"
          option={revenueOption}
        />
        <ChartPanel
          title="حالة المتاجر"
          description={`${storeMetrics.activeStores || 0} نشطة من أصل ${storeMetrics.totalStores || 0}`}
          icon={PieChartIcon}
          empty={storesEmpty}
          emptyText="لا توجد بيانات متاجر للعرض"
          option={storeOption}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartPanel
          title="استخدام الطلبات"
          description="حجم الطلبات وأداء الدفع"
          icon={ChartLineData01Icon}
          empty={ordersTotal === 0}
          emptyText="لا توجد طلبات للعرض"
          option={ordersOption}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AttentionCard
            title="تذاكر مفتوحة"
            value={(adminData.ticketsOpened || 0).toLocaleString('en-US')}
            icon={CustomerSupportIcon}
          />
          <AttentionCard
            title="تذاكر محلولة"
            value={(adminData.ticketsResolved || 0).toLocaleString('en-US')}
            icon={CheckmarkCircle02Icon}
          />
          <AttentionCard
            title="متاجر بهبوط طلبات"
            value={(riskData.storesWithDropInOrders?.length || 0).toLocaleString('en-US')}
            icon={Package01Icon}
          />
          <AttentionCard
            title="مخاطر تحتاج متابعة"
            value={riskCount.toLocaleString('en-US')}
            icon={Alert02Icon}
          />
        </div>
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

const DashboardSkeleton = () => (
  <div className="page-shell bg-[#f8fafc] text-right" dir="rtl">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-2xl sm:w-40" />
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="gap-4 py-5">
          <CardHeader className="gap-3 px-5">
            <CardAction>
              <Skeleton className="size-10 rounded-xl" />
            </CardAction>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </CardHeader>
          <CardContent className="px-5 pt-0">
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
      <Card className="gap-4 py-5">
        <CardHeader className="gap-2 px-5">
          <CardAction>
            <Skeleton className="size-10 rounded-xl" />
          </CardAction>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="px-5 pt-0">
          <Skeleton className="h-80 w-full rounded-xl" />
        </CardContent>
      </Card>
      <Card className="gap-4 py-5">
        <CardHeader className="gap-2 px-5">
          <CardAction>
            <Skeleton className="size-10 rounded-xl" />
          </CardAction>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="px-5 pt-0">
          <Skeleton className="h-80 w-full rounded-xl" />
        </CardContent>
      </Card>
    </div>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card className="gap-4 py-5">
        <CardHeader className="gap-2 px-5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-44" />
        </CardHeader>
        <CardContent className="px-5 pt-0">
          <Skeleton className="h-80 w-full rounded-xl" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="gap-3 py-4">
            <CardHeader className="gap-2 px-4">
              <CardAction>
                <Skeleton className="size-9 rounded-lg" />
              </CardAction>
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent className="px-4 pt-0">
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>

    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="space-y-3 p-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-xl" />
        ))}
      </CardContent>
    </Card>
  </div>
);

const KpiCard = ({
  title,
  description,
  value,
  icon,
  badge,
  badgeVariant = 'secondary',
  accent = false,
}: {
  title: string;
  description: string;
  value: string;
  icon: IconSvgElement;
  badge?: string;
  badgeVariant?: 'secondary' | 'outline' | 'default';
  accent?: boolean;
}) => (
  <Card
    className={cn(
      'gap-4 py-5',
      accent && 'border-violet-200 bg-gradient-to-br from-violet-50/80 to-card shadow-[0_12px_32px_rgba(125,38,247,0.12)]',
    )}
  >
    <CardHeader className="gap-3 px-5 [.border-b]:pb-0">
      <CardAction>
        <span
          className={cn(
            'grid size-10 place-items-center rounded-xl',
            accent ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground',
          )}
        >
          <HugeiconsIcon icon={icon} size={20} strokeWidth={2.2} />
        </span>
      </CardAction>
      <CardTitle className="text-sm font-bold text-muted-foreground">{title}</CardTitle>
      <CardDescription className="text-xs">{description}</CardDescription>
    </CardHeader>
    <CardContent className="flex items-end justify-between gap-2 px-5 pt-0">
      <p className={cn('text-2xl font-black tracking-tight text-foreground sm:text-3xl', accent && 'text-violet-700')}>
        {value}
      </p>
      {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
    </CardContent>
  </Card>
);

const ChartPanel = ({
  title,
  description,
  icon,
  option,
  empty = false,
  emptyText = 'لا توجد بيانات',
}: {
  title: string;
  description: string;
  icon: IconSvgElement;
  option: EChartsOption;
  empty?: boolean;
  emptyText?: string;
}) => (
  <Card className="gap-4 overflow-hidden py-5">
    <CardHeader className="gap-1 px-5">
      <CardAction>
        <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
          <HugeiconsIcon icon={icon} size={20} strokeWidth={2.2} />
        </span>
      </CardAction>
      <CardTitle className="text-lg font-black text-foreground">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="px-5 pt-0">
      <div className="relative h-80 w-full">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 text-center">
            <p className="text-sm font-bold text-slate-500">{emptyText}</p>
            <p className="text-xs text-slate-400">ستظهر الرسوم هنا عند توفر البيانات</p>
          </div>
        ) : (
          <ReactECharts
            option={option}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
            notMerge
            lazyUpdate
          />
        )}
      </div>
    </CardContent>
  </Card>
);

const AttentionCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: IconSvgElement;
}) => (
  <Card className="gap-3 py-4">
    <CardHeader className="gap-1 px-4">
      <CardAction>
        <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
          <HugeiconsIcon icon={icon} size={18} strokeWidth={2.2} />
        </span>
      </CardAction>
      <CardTitle className="text-xs font-bold text-muted-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent className="px-4 pt-0">
      <p className="text-2xl font-black text-foreground">{value}</p>
    </CardContent>
  </Card>
);

const formatMoney = (value?: number) => (value ? `${value.toLocaleString('en-US')} د.ع` : '0 د.ع');

export default Dashboard;
