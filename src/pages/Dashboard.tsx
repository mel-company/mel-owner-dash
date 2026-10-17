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
import type { StatusTone } from '@/components/dashboard';
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
  const [failed, setFailed] = useState<string[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // One failing endpoint used to blank every card to 0, which reads as
      // "nothing happened" rather than "couldn't load". Load what loads and
      // say which part is missing.
      const sections = [
        ['المؤشرات المالية', ownerStatsService.getKeyKPIs(), setKpis],
        ['المتاجر', ownerStatsService.getStoreMetrics(), setStoreMetrics],
        ['الطلبات', ownerStatsService.getOrdersPlatformUsage(), setOrdersData],
        ['الميزات', ownerStatsService.getFeaturesAdoption(), setFeaturesData],
        ['المخاطر', ownerStatsService.getRiskAttention(), setRiskData],
        ['الجغرافيا', ownerStatsService.getGeographyMarketSignals(), setGeographyData],
        ['الدعم', ownerStatsService.getAdminProductivity(), setAdminData],
      ] as const;
      const results = await Promise.allSettled(sections.map(([, request]) => request));
      const missing: string[] = [];
      results.forEach((result, index) => {
        const [label, , apply] = sections[index];
        if (result.status === 'fulfilled') {
          (apply as (value: unknown) => void)(result.value ?? {});
        } else {
          missing.push(label);
          console.error(`Error fetching dashboard ${label}:`, result.reason);
        }
      });
      setFailed(missing);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const revenueDaily = kpis.revenue_daily ?? [];
  const revenueOption = useMemo<EChartsOption>(() => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      textStyle: { fontFamily: 'Setar XS, sans-serif' },
      valueFormatter: (value) => formatMoney(Number(value)),
    },
    grid: { left: 16, right: 16, top: 24, bottom: 32, containLabel: true },
    xAxis: {
      type: 'category',
      data: revenueDaily.map((day) => day.date.slice(5).replace('-', '/')),
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
      name: 'إيرادات المنصة',
      type: 'bar',
      barMaxWidth: 18,
      itemStyle: { color: '#7c3aed', borderRadius: [6, 6, 0, 0] },
      data: revenueDaily.map((day) => day.amount),
    }],
  }), [kpis.revenue_daily]); // eslint-disable-line react-hooks/exhaustive-deps

  const byStatus = ordersData.ordersByStatus;
  const ordersOption = useMemo<EChartsOption>(() => {
    const rows = [
      { name: 'قيد الانتظار', value: byStatus?.pending ?? 0, color: '#94a3b8' },
      { name: 'قيد التجهيز', value: byStatus?.processing ?? 0, color: '#38bdf8' },
      { name: 'تم الشحن', value: byStatus?.shipped ?? 0, color: '#7c3aed' },
      { name: 'تم التوصيل', value: byStatus?.delivered ?? 0, color: '#10b981' },
      { name: 'ملغاة', value: byStatus?.cancelled ?? 0, color: '#ef4444' },
    ];
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        textStyle: { fontFamily: 'Setar XS, sans-serif' },
      },
      grid: { left: 16, right: 16, top: 24, bottom: 32, containLabel: true },
      xAxis: {
        type: 'category',
        data: rows.map((row) => row.name),
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
        data: rows.map((row) => ({
          value: row.value,
          itemStyle: { color: row.color, borderRadius: [12, 12, 0, 0] },
        })),
      }],
    };
  }, [byStatus]);

  /**
   * Every store lands in exactly one slice. The pie used to show "active",
   * "without products" and "without orders" side by side, which overlap (a
   * store with no products usually has no orders either), so its percentages
   * added up to more than the platform.
   */
  const storeGroups = useMemo(() => {
    const total = storeMetrics.totalStores || 0;
    const active = storeMetrics.activeStores || 0;
    const withoutOrders = storeMetrics.storesWithoutOrders || 0;
    const empty = storeMetrics.storesWithoutProductsOrOrders;
    const dormant = Math.max(0, total - withoutOrders - active);
    if (empty == null) {
      // Older server: can't separate "no products" from "no orders" yet.
      return [
        { name: 'نشطة', value: active, color: '#10b981' },
        { name: 'لها طلبات سابقة فقط', value: dormant, color: '#f59e0b' },
        { name: 'بدون طلبات', value: withoutOrders, color: '#ef4444' },
      ];
    }
    return [
      { name: 'نشطة', value: active, color: '#10b981' },
      { name: 'لها طلبات سابقة فقط', value: dormant, color: '#f59e0b' },
      { name: 'لديها منتجات بلا طلبات', value: Math.max(0, withoutOrders - empty), color: '#f97316' },
      { name: 'بلا منتجات ولا طلبات', value: empty, color: '#ef4444' },
    ];
  }, [storeMetrics]);

  const storeOption = useMemo<EChartsOption>(() => ({
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
      data: storeGroups.map((row) => ({ name: row.name, value: row.value, itemStyle: { color: row.color } })),
    }],
  }), [storeGroups]);

  const revenueEmpty = !revenueDaily.some((day) => day.amount > 0);
  const ordersEmpty = !byStatus || !Object.values(byStatus).some((count) => count > 0);
  const storesEmpty = !storeMetrics.totalStores;

  const expiredSubscriptions = riskData.storesWithExpiredSubscriptions?.length || 0;
  const riskCount = expiredSubscriptions
    + (riskData.storesWithHighRefunds?.length || 0)
    + (riskData.abusedCoupons?.length || 0);

  const activeShare = storeMetrics.totalStores
    ? Math.round(((storeMetrics.activeStores || 0) / storeMetrics.totalStores) * 100)
    : null;

  const openTickets = adminData.ticketsOpen ?? adminData.ticketsOpened;
  const settledOrders = (byStatus?.delivered ?? 0) + (byStatus?.cancelled ?? 0);
  const successRate = ordersData.orderSuccessRate ?? 0;
  const totalStores = storeMetrics.totalStores || 0;
  const withoutProducts = storeMetrics.storesWithoutProducts || 0;
  const statesWithOrders = geographyData.ordersByState?.length || 0;
  const topState = geographyData.mostCommonState;
  const avgReply = adminData.avgResponseTimeHours;

  const indicatorRows: Array<{
    label: string;
    value: string;
    tone: StatusTone;
    status: string;
    note: string;
    icon: IconSvgElement;
  }> = [
    settledOrders === 0
      ? {
          label: 'معدل نجاح الطلبات',
          value: '—',
          tone: 'slate',
          status: 'لا بيانات',
          note: 'لا توجد طلبات مسلّمة أو ملغاة بعد',
          icon: CheckmarkCircle02Icon,
        }
      : {
          label: 'معدل نجاح الطلبات',
          value: `${successRate.toFixed(1)}%`,
          tone: successRate >= 80 ? 'green' : successRate >= 60 ? 'amber' : 'red',
          status: successRate >= 80 ? 'جيد' : successRate >= 60 ? 'متوسط' : 'ضعيف',
          note: `${(byStatus?.delivered ?? 0).toLocaleString('en-US')} مسلّمة مقابل ${(byStatus?.cancelled ?? 0).toLocaleString('en-US')} ملغاة`,
          icon: CheckmarkCircle02Icon,
        },
    {
      label: 'مبيعات المتاجر',
      value: formatMoney(kpis.store_sales_total),
      tone: 'blue',
      status: 'للمتابعة',
      note: `الطلبات المسلّمة بعد الخصم · هذا الشهر ${formatMoney(kpis.store_sales_this_month)}`,
      icon: Invoice03Icon,
    },
    {
      label: 'اشتراكات مدفوعة سارية',
      value: (kpis.paying_subscriptions ?? 0).toLocaleString('en-US'),
      tone: (kpis.paying_subscriptions ?? 0) > 0 ? 'green' : 'slate',
      status: (kpis.paying_subscriptions ?? 0) > 0 ? 'مستقر' : 'لا يوجد',
      note: `إيراد شهري متكرر ${formatMoney(kpis.monthly_recurring_revenue)}`,
      icon: Wallet02Icon,
    },
    {
      label: 'اشتراكات منتهية',
      value: expiredSubscriptions.toLocaleString('en-US'),
      tone: expiredSubscriptions > 0 ? 'red' : 'green',
      status: expiredSubscriptions > 0 ? 'متابعة' : 'مستقر',
      note: 'متاجر انتهت مدة اشتراكها',
      icon: Alert02Icon,
    },
    {
      label: 'المتاجر بدون منتجات',
      value: withoutProducts.toLocaleString('en-US'),
      tone: withoutProducts > 0 ? 'amber' : 'green',
      status: withoutProducts > 0 ? 'متابعة' : 'مستقر',
      note: totalStores
        ? `${Math.round((withoutProducts / totalStores) * 100)}% من المتاجر`
        : 'لا توجد متاجر',
      icon: Package01Icon,
    },
    {
      label: 'المحافظات التي فيها طلبات',
      value: statesWithOrders.toLocaleString('en-US'),
      tone: 'blue',
      status: statesWithOrders > 0 ? 'نشط' : 'لا بيانات',
      note: topState ? `الأكثر طلباً: ${topState.stateName} (${topState.orderCount.toLocaleString('en-US')})` : 'لا توجد طلبات بعنوان محافظة',
      icon: Globe02Icon,
    },
    {
      label: 'تبني الميزات',
      value: `${Math.round(featuresData.storesUsingOnlinePaymentsPercent ?? 0)}% دفع إلكتروني`,
      tone: 'violet',
      status: 'للمتابعة',
      note: `كوبونات ${Math.round(featuresData.storesUsingCouponsPercent ?? 0)}% · شركة توصيل ${Math.round(featuresData.storesUsingDeliveryIntegrationPercent ?? 0)}% من المتاجر`,
      icon: AnalyticsUpIcon,
    },
    {
      label: 'متوسط زمن الرد على التذاكر',
      value: avgReply ? formatHours(avgReply) : '—',
      tone: !avgReply ? 'slate' : avgReply <= 4 ? 'green' : avgReply <= 24 ? 'amber' : 'red',
      status: !avgReply ? 'لا بيانات' : avgReply <= 4 ? 'جيد' : avgReply <= 24 ? 'متوسط' : 'بطيء',
      note: 'من فتح التذكرة حتى أول رد من الفريق',
      icon: CustomerSupportIcon,
    },
  ];

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

      {failed.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          تعذّر تحميل بعض الأرقام ({failed.join('، ')}). الأرقام الظاهرة كـ «—» غير متوفرة وليست صفراً.
        </div>
      )}

      <div className="grid grid-cols-2 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="إجمالي المتاجر"
          description={`جديدة اليوم ${formatCount(storeMetrics.newStoresToday)} · هذا الشهر ${formatCount(storeMetrics.newStoresThisMonth)}`}
          value={formatCount(storeMetrics.totalStores)}
          icon={StoreManagement01Icon}
        />
        <KpiCard
          title="المتاجر النشطة"
          description="استلمت طلباً خلال آخر 30 يوماً"
          value={formatCount(storeMetrics.activeStores)}
          icon={UserGroupIcon}
          badge={activeShare != null ? `${activeShare}% نشط` : undefined}
          badgeVariant="secondary"
        />
        <KpiCard
          title="إيرادات المنصة"
          description={`اليوم ${formatMoney(kpis.revenue_today)} · الشهر ${formatMoney(kpis.revenue_this_month)}`}
          value={formatMoney(kpis.total_revenue)}
          icon={Wallet02Icon}
          accent
        />
        <KpiCard
          title="إجمالي الطلبات"
          description={`اليوم ${formatCount(ordersData.ordersToday)} · آخر 7 أيام ${formatCount(ordersData.ordersLast7Days)}`}
          value={formatCount(ordersData.totalOrders)}
          icon={Invoice03Icon}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
        <ChartPanel
          title="إيرادات المنصة"
          description="ما دفعه التجار لمِل يومياً خلال آخر 30 يوماً (اشتراكات، رصيد، نطاقات) بعد الاسترجاع"
          icon={ChartHistogramIcon}
          empty={revenueEmpty}
          emptyText={kpis.revenue_daily ? 'لا توجد مدفوعات خلال آخر 30 يوماً' : 'الرسم اليومي يحتاج تحديث الخادم'}
          option={revenueOption}
        />
        <ChartPanel
          title="حالة المتاجر"
          description={`${formatCount(storeMetrics.activeStores)} نشطة من أصل ${formatCount(storeMetrics.totalStores)}`}
          icon={PieChartIcon}
          empty={storesEmpty}
          emptyText="لا توجد بيانات متاجر للعرض"
          option={storeOption}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartPanel
          title="الطلبات حسب الحالة"
          description="كل طلبات المتاجر القائمة"
          icon={ChartLineData01Icon}
          empty={ordersEmpty}
          emptyText={byStatus ? 'لا توجد طلبات للعرض' : 'الرسم يحتاج تحديث الخادم'}
          option={ordersOption}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AttentionCard
            title="تذاكر مفتوحة الآن"
            value={formatCount(openTickets)}
            icon={CustomerSupportIcon}
          />
          <AttentionCard
            title="تذاكر محلولة"
            value={formatCount(adminData.ticketsResolved)}
            icon={CheckmarkCircle02Icon}
          />
          <AttentionCard
            title="متاجر بهبوط طلبات"
            value={formatCount(riskData.storesWithDropInOrders?.length)}
            icon={Package01Icon}
          />
          <AttentionCard
            title="مخاطر تحتاج متابعة"
            value={riskData.storesWithExpiredSubscriptions ? riskCount.toLocaleString('en-US') : '—'}
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
            {indicatorRows.map((row) => (
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
                  <StatusPill tone={row.tone}>{row.status}</StatusPill>
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

    <div className="grid grid-cols-2 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
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

/** «—» when the server didn't send the number, so a missing figure never reads as 0. */
const formatMoney = (value?: number) =>
  value == null ? '—' : `${Math.round(value).toLocaleString('en-US')} د.ع`;

const formatCount = (value?: number) => (value == null ? '—' : value.toLocaleString('en-US'));

const formatHours = (hours: number) => {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} دقيقة`;
  if (hours < 48) return `${hours.toFixed(1)} ساعة`;
  return `${(hours / 24).toFixed(1)} يوم`;
};

export default Dashboard;
