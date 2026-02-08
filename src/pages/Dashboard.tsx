import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Store,
  Users,
  Wallet,
  FileText,
  Package,
  Store as StoreIcon,
  DollarSign,
  UserPlus,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  MapPin,
  HelpCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  ownerStatsService,
  type FeaturesAdoption,
  type OrdersPlatformUsage,
  type KeyKPIs,
  type StoreMetrics,
  type RiskAttention,
  type GeographyMarketSignals,
  type AdminProductivity,
  type CountryOrder,
  type StateOrder,
} from '../services/ownerStatsService';
import { ArrowLeft } from 'lucide-react';
import type { RegionOrder } from '../services/ownerStatsService';
import MapboxMap from '../components/MapboxMap';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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
  const [selectedCountry, setSelectedCountry] = useState<CountryOrder | null>(null);
  const [selectedState, setSelectedState] = useState<StateOrder | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionOrder | null>(null);
  const [viewLevel, setViewLevel] = useState<'countries' | 'states' | 'regions'>('countries');

  // Filter states by selected country (if any)
  const filteredStates = useMemo(() => {
    if (viewLevel === 'states' && selectedCountry) {
      // Return all states when a country is selected (you can filter by countryId if available)
      return geographyData.ordersByState || [];
    }
    return geographyData.ordersByState || [];
  }, [geographyData.ordersByState, selectedCountry, viewLevel]);

  // Filter regions by selected state (if any)
  const filteredRegions = useMemo(() => {
    if (viewLevel === 'regions' && selectedState) {
      // Return all regions when a state is selected (you can filter by stateId if available)
      return geographyData.ordersByRegion || [];
    }
    return geographyData.ordersByRegion || [];
  }, [geographyData.ordersByRegion, selectedState, viewLevel]);

  // Type guards
  const isCountryOrder = (item: CountryOrder | StateOrder | RegionOrder | null): item is CountryOrder => {
    return item !== null && 'countryId' in item;
  };

  const isStateOrder = (item: CountryOrder | StateOrder | RegionOrder | null): item is StateOrder => {
    return item !== null && 'stateId' in item;
  };

  const isRegionOrder = (item: CountryOrder | StateOrder | RegionOrder | null): item is RegionOrder => {
    return item !== null && 'regionId' in item;
  };

  // Handle country selection - drill down to states
  const handleCountrySelect = (item: CountryOrder | StateOrder | RegionOrder | null) => {
    if (item === null) {
      setSelectedCountry(null);
      setViewLevel('countries');
    } else if (isCountryOrder(item)) {
      setSelectedCountry(item);
      setViewLevel('states');
      setSelectedState(null); // Reset state selection
    }
  };

  // Handle state selection - drill down to regions
  const handleStateSelect = (item: CountryOrder | StateOrder | RegionOrder | null) => {
    if (item === null) {
      setSelectedState(null);
      setViewLevel('states');
    } else if (isStateOrder(item)) {
      setSelectedState(item);
      setViewLevel('regions');
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (viewLevel === 'regions') {
      setSelectedState(null);
      setSelectedRegion(null);
      setViewLevel('states');
    } else if (viewLevel === 'states') {
      setSelectedCountry(null);
      setSelectedState(null);
      setViewLevel('countries');
    }
  };

  // Handle region selection
  const handleRegionSelect = (item: CountryOrder | StateOrder | RegionOrder | null) => {
    if (item === null) {
      setSelectedRegion(null);
    } else if (isRegionOrder(item)) {
      setSelectedRegion(item);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [
        kpisData,
        storeMetricsData,
        ordersData,
        featuresData,
        riskData,
        geographyData,
        adminData,
      ] = await Promise.all([
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
      setOrdersData(ordersData);
      setFeaturesData(featuresData);
      setRiskData(riskData);
      setGeographyData(geographyData);
      setAdminData(adminData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats: Array<{
    title: string;
    value: string | number;
    change: string;
    icon: LucideIcon;
    gradient: string;
    bgGradient: string;
    changeColor: string;
    currency?: string;
    borderColor: string;
  }> = [
      {
        title: 'إجمالي المتاجر',
        value: storeMetrics.totalStores || 0,
        change: storeMetrics.newStoresThisMonth ? `+${storeMetrics.newStoresThisMonth}` : '0',
        icon: Store,
        gradient: 'from-blue-500 to-cyan-500',
        bgGradient: 'from-blue-50 to-cyan-50',
        changeColor: 'text-green-600',
        borderColor: 'border-blue-200',
      },
      {
        title: 'المتاجر النشطة',
        value: storeMetrics.activeStores || 0,
        change: `${kpis.stores_active_after_30_days_percent?.toFixed(1) || 0}%`,
        icon: Users,
        gradient: 'from-green-500 to-emerald-500',
        bgGradient: 'from-green-50 to-emerald-50',
        changeColor: 'text-green-600',
        borderColor: 'border-green-200',
      },
      {
        title: 'إجمالي الإيرادات',
        value: kpis.total_revenue ? kpis.total_revenue.toLocaleString('ar-IQ') : '0',
        change: kpis.revenue_this_month ? `+${kpis.revenue_this_month.toLocaleString('ar-IQ')}` : '0',
        icon: Wallet,
        gradient: 'from-purple-500 to-pink-500',
        bgGradient: 'from-purple-50 to-pink-50',
        changeColor: 'text-green-600',
        currency: 'دينار',
        borderColor: 'border-purple-200',
      },
      {
        title: 'الإيرادات الشهرية',
        value: kpis.monthly_recurring_revenue ? kpis.monthly_recurring_revenue.toLocaleString('ar-IQ') : '0',
        change: kpis.revenue_today ? `+${kpis.revenue_today.toLocaleString('ar-IQ')}` : '0',
        icon: DollarSign,
        gradient: 'from-orange-500 to-red-500',
        bgGradient: 'from-orange-50 to-red-50',
        changeColor: 'text-green-600',
        currency: 'دينار',
        borderColor: 'border-orange-200',
      },
      {
        title: 'إجمالي الطلبات',
        value: ordersData.totalOrders || 0,
        change: ordersData.ordersToday ? `+${ordersData.ordersToday}` : '0',
        icon: FileText,
        gradient: 'from-indigo-500 to-purple-500',
        bgGradient: 'from-indigo-50 to-purple-50',
        changeColor: 'text-green-600',
        borderColor: 'border-indigo-200',
      },
      {
        title: 'متوسط قيمة الطلب',
        value: ordersData.averageOrderValue ? ordersData.averageOrderValue.toLocaleString('ar-IQ') : '0',
        change: `${ordersData.orderSuccessRate?.toFixed(1) || 0}%`,
        icon: Package,
        gradient: 'from-pink-500 to-rose-500',
        bgGradient: 'from-pink-50 to-rose-50',
        changeColor: 'text-green-600',
        currency: 'دينار',
        borderColor: 'border-pink-200',
      },
    ];

  // Prepare chart data
  const storesMetricsData = {
    labels: ['إجمالي المتاجر', 'المتاجر النشطة', 'بدون منتجات', 'بدون طلبات'],
    datasets: [
      {
        label: 'المتاجر',
        data: [
          storeMetrics.totalStores || 0,
          storeMetrics.activeStores || 0,
          storeMetrics.storesWithoutProducts || 0,
          storeMetrics.storesWithoutOrders || 0,
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const ordersMetricsData = {
    labels: ['إجمالي الطلبات', 'طلبات اليوم', 'آخر 7 أيام', 'ملغاة', 'نجحت', 'فشلت'],
    datasets: [
      {
        label: 'الطلبات',
        data: [
          ordersData.totalOrders || 0,
          ordersData.ordersToday || 0,
          ordersData.ordersLast7Days || 0,
          ordersData.cancelledOrders || 0,
          ordersData.paymentSuccessCount || 0,
          ordersData.paymentFailureCount || 0,
        ],
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 2,
      },
    ],
  };

  const revenueOverTimeData = {
    labels: ['الإيرادات الشهرية', 'الإيرادات السنوية', 'إجمالي الإيرادات', 'إيرادات اليوم', 'إيرادات هذا الشهر'],
    datasets: [
      {
        label: 'الإيرادات',
        data: [
          kpis.monthly_recurring_revenue || 0,
          kpis.annual_recurring_revenue ? kpis.annual_recurring_revenue / 12 : 0,
          kpis.total_revenue || 0,
          kpis.revenue_today || 0,
          kpis.revenue_this_month || 0,
        ],
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.2)' as const,
        borderColor: 'rgba(59, 130, 246, 1)' as const,
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  const featuresAdoptionData = {
    labels: featuresData.mostUsedPaymentGateways
      ? featuresData.mostUsedPaymentGateways.map((gateway) => gateway.provider)
      : ['الكوبونات', 'التكامل مع التوصيل', 'الدفع الإلكتروني', 'الصفحات المخصصة', 'متعدد الإداريين'],
    datasets: [
      {
        label: 'النسبة المئوية',
        data: [
          featuresData.storesUsingCouponsPercent || 0,
          featuresData.storesUsingDeliveryIntegrationPercent || 0,
          featuresData.storesUsingOnlinePaymentsPercent || 0,
          featuresData.storesUsingCustomPagesPercent || 0,
          featuresData.storesWithMultipleAdminsPercent || 0,
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(139, 92, 246, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Geography & Market Signals Data for Chart (Countries)
  const geographyCountriesChart = {
    labels: geographyData.ordersByCountry
      ? geographyData.ordersByCountry.map((country) => country.countryName)
      : [],
    datasets: [
      {
        label: 'عدد الطلبات',
        data: geographyData.ordersByCountry
          ? geographyData.ordersByCountry.map((country) => country.orderCount)
          : [],
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 2,
      },
    ],
  };

  // Geography & Market Signals Data for Chart (States)
  const geographyDataChart = {
    labels: geographyData.ordersByState
      ? geographyData.ordersByState.map((state) => state.stateName)
      : [],
    datasets: [
      {
        label: 'عدد الطلبات',
        data: geographyData.ordersByState
          ? geographyData.ordersByState.map((state) => state.orderCount)
          : [],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: 'Cairo, sans-serif',
          },
        },
      },
      title: {
        display: false,
      },
    },
  };

  const pieChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: {
        position: 'bottom' as const,
        labels: {
          font: {
            family: 'Cairo, sans-serif',
          },
        },
      },
    },
  };

  const recentActivity: Array<{
    id: number;
    action: string;
    time: string;
    type: string;
    color: string;
    icon: LucideIcon;
  }> = [
      {
        id: 1,
        action: 'متجر جديد تم إنشاؤه',
        time: 'منذ ساعتين',
        type: 'store',
        color: 'bg-blue-100 text-blue-700',
        icon: StoreIcon
      },
      {
        id: 2,
        action: 'دفعة جديدة تم استلامها',
        time: 'منذ 3 ساعات',
        type: 'payment',
        color: 'bg-green-100 text-green-700',
        icon: DollarSign
      },
      {
        id: 3,
        action: 'موظف جديد تم إضافته',
        time: 'منذ 5 ساعات',
        type: 'employee',
        color: 'bg-purple-100 text-purple-700',
        icon: UserPlus
      },
      {
        id: 4,
        action: 'تذكرة دعم تم حلها',
        time: 'منذ يوم',
        type: 'support',
        color: 'bg-orange-100 text-orange-700',
        icon: CheckCircle
      },
    ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-24 -mb-24"></div>
        </div>

        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-1">
                  مرحباً بك، {user?.name}
                </h1>
                <p className="text-indigo-100 text-base md:text-lg">
                  نظرة سريعة على إحصائيات mel.iq
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/30 shadow-lg">
              <p className="text-xs text-indigo-100 mb-1 font-medium">التاريخ</p>
              <p className="text-xl font-bold">
                {new Date().toLocaleDateString('ar-IQ', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${stat.bgGradient} rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 ${stat.borderColor} group`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-16 h-16 bg-gradient-to-br ${stat.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className="h-8 w-8 text-white" />
              </div>
              <div className="text-left">
                <span className={`text-sm font-bold px-3 py-1.5 rounded-lg bg-white/80 backdrop-blur-sm ${stat.changeColor} shadow-sm`}>
                  {stat.change}
                </span>
              </div>
            </div>

            <h3 className="text-gray-700 text-sm font-semibold mb-3">{stat.title}</h3>

            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-gray-900">
                {stat.value}
              </p>
              {stat.currency && (
                <span className="text-lg text-gray-600 font-medium">
                  {stat.currency}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Over Time - Line Chart */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">الإيرادات</h3>
          <div className="h-64">
            <Line data={revenueOverTimeData} options={chartOptions} />
          </div>
        </div>

        {/* Orders Metrics - Bar Chart */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">مقاييس الطلبات</h3>
          <div className="h-64">
            <Bar data={ordersMetricsData} options={chartOptions} />
          </div>
        </div>

        {/* Stores Metrics - Pie Chart */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">مقاييس المتاجر</h3>
          <div className="h-64">
            <Pie data={storesMetricsData} options={pieChartOptions} />
          </div>
        </div>

        {/* Features Adoption - Doughnut Chart */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">اعتماد الميزات</h3>
          <div className="h-64">
            <Doughnut data={featuresAdoptionData} options={pieChartOptions} />
          </div>
        </div>

        {/* Geography & Market Signals - Countries Bar Chart */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">الطلبات حسب الدول</h3>
          <div className="h-64">
            {geographyData.ordersByCountry && geographyData.ordersByCountry.length > 0 ? (
              <Bar data={geographyCountriesChart} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                لا توجد بيانات
              </div>
            )}
          </div>
        </div>

        {/* Geography & Market Signals - States Bar Chart */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">الطلبات حسب المحافظة</h3>
          <div className="h-64">
            {geographyData.ordersByState && geographyData.ordersByState.length > 0 ? (
              <Bar data={geographyDataChart} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                لا توجد بيانات
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Map Section - Drill-down */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-purple-600" />
            <h3 className="text-xl font-bold text-gray-800">
              {viewLevel === 'countries' && 'خريطة تفاعلية - الدول'}
              {viewLevel === 'states' && `خريطة تفاعلية - محافظات ${selectedCountry?.countryName || ''}`}
              {viewLevel === 'regions' && `خريطة تفاعلية - مناطق ${selectedState?.stateName || ''}`}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {viewLevel !== 'countries' && (
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                رجوع
              </button>
            )}
          </div>
        </div>

        {/* Map based on view level */}
        {viewLevel === 'countries' && geographyData.ordersByCountry && geographyData.ordersByCountry.length > 0 && (
          <MapboxMap
            countries={geographyData.ordersByCountry}
            type="country"
            onSelect={handleCountrySelect}
            selectedItem={selectedCountry}
          />
        )}

        {viewLevel === 'states' && filteredStates.length > 0 && (
          <MapboxMap
            states={filteredStates}
            type="state"
            onSelect={handleStateSelect}
            selectedItem={selectedState}
          />
        )}

        {viewLevel === 'regions' && filteredRegions.length > 0 && (
          <MapboxMap
            regions={filteredRegions}
            type="region"
            onSelect={handleRegionSelect}
            selectedItem={selectedRegion}
          />
        )}

        {/* Selected Item Details */}
        {selectedCountry && viewLevel === 'countries' && (
          <div className="mt-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border-2 border-purple-200 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="h-6 w-6 text-purple-600" />
              <h3 className="text-2xl font-bold text-gray-800">{selectedCountry.countryName}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <p className="text-sm text-gray-600 mb-1">عدد الطلبات</p>
                <p className="text-3xl font-bold text-purple-600">{selectedCountry.orderCount}</p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-green-200">
                <p className="text-sm text-gray-600 mb-1">الإيرادات</p>
                <p className="text-3xl font-bold text-green-600">
                  {selectedCountry.revenue.toLocaleString('ar-IQ')} دينار
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-gray-600 mb-1">متوسط قيمة الطلب</p>
                <p className="text-3xl font-bold text-blue-600">
                  {selectedCountry.orderCount > 0
                    ? (selectedCountry.revenue / selectedCountry.orderCount).toLocaleString('ar-IQ', {
                      maximumFractionDigits: 0,
                    })
                    : 0}{' '}
                  دينار
                </p>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              💡 اضغط على الدولة في الخريطة لعرض محافظاتها
            </div>
          </div>
        )}

        {selectedState && viewLevel === 'states' && (
          <div className="mt-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 border-2 border-indigo-200 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="h-6 w-6 text-indigo-600" />
              <h3 className="text-2xl font-bold text-gray-800">{selectedState.stateName}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-indigo-200">
                <p className="text-sm text-gray-600 mb-1">عدد الطلبات</p>
                <p className="text-3xl font-bold text-indigo-600">{selectedState.orderCount}</p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-green-200">
                <p className="text-sm text-gray-600 mb-1">الإيرادات</p>
                <p className="text-3xl font-bold text-green-600">
                  {selectedState.revenue.toLocaleString('ar-IQ')} دينار
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-gray-600 mb-1">متوسط قيمة الطلب</p>
                <p className="text-3xl font-bold text-blue-600">
                  {selectedState.orderCount > 0
                    ? (selectedState.revenue / selectedState.orderCount).toLocaleString('ar-IQ', {
                      maximumFractionDigits: 0,
                    })
                    : 0}{' '}
                  دينار
                </p>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              💡 اضغط على المحافظة في الخريطة لعرض مناطقها
            </div>
          </div>
        )}

        {selectedRegion && viewLevel === 'regions' && (
          <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="h-6 w-6 text-green-600" />
              <h3 className="text-2xl font-bold text-gray-800">{selectedRegion.regionName}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <p className="text-sm text-gray-600 mb-1">عدد الطلبات</p>
                <p className="text-3xl font-bold text-green-600">{selectedRegion.orderCount}</p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-green-200">
                <p className="text-sm text-gray-600 mb-1">الإيرادات</p>
                <p className="text-3xl font-bold text-green-600">
                  {selectedRegion.revenue.toLocaleString('ar-IQ')} دينار
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-gray-600 mb-1">متوسط قيمة الطلب</p>
                <p className="text-3xl font-bold text-blue-600">
                  {selectedRegion.orderCount > 0
                    ? (selectedRegion.revenue / selectedRegion.orderCount).toLocaleString('ar-IQ', {
                      maximumFractionDigits: 0,
                    })
                    : 0}{' '}
                  دينار
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Geography Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Orders by Country Table */}
        {geographyData.ordersByCountry && geographyData.ordersByCountry.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="h-6 w-6 text-purple-600" />
              <h3 className="text-xl font-bold text-gray-800">الطلبات حسب الدولة</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الدولة</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">عدد الطلبات</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإيرادات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {geographyData.ordersByCountry.map((country) => (
                    <tr key={country.countryId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{country.countryName}</td>
                      <td className="px-4 py-3 text-gray-600">{country.orderCount}</td>
                      <td className="px-4 py-3 text-gray-600">{country.revenue.toLocaleString('ar-IQ')} دينار</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders by State Table */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="h-6 w-6 text-indigo-600" />
            <h3 className="text-xl font-bold text-gray-800">الطلبات حسب المحافظة</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المحافظة</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">عدد الطلبات</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإيرادات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {geographyData.ordersByState && geographyData.ordersByState.length > 0 ? (
                  geographyData.ordersByState.map((state) => (
                    <tr key={state.stateId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{state.stateName}</td>
                      <td className="px-4 py-3 text-gray-600">{state.orderCount}</td>
                      <td className="px-4 py-3 text-gray-600">{state.revenue.toLocaleString('ar-IQ')} دينار</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      لا توجد بيانات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Orders by Region Table */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="h-6 w-6 text-green-600" />
            <h3 className="text-xl font-bold text-gray-800">الطلبات حسب المنطقة</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المنطقة</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">عدد الطلبات</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإيرادات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {geographyData.ordersByRegion && geographyData.ordersByRegion.length > 0 ? (
                  geographyData.ordersByRegion.map((region) => (
                    <tr key={region.regionId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{region.regionName}</td>
                      <td className="px-4 py-3 text-gray-600">{region.orderCount}</td>
                      <td className="px-4 py-3 text-gray-600">{region.revenue.toLocaleString('ar-IQ')} دينار</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      لا توجد بيانات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Admin Productivity Table */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-6">إنتاجية الإدارة</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">التذاكر المفتوحة</p>
            <p className="text-2xl font-bold text-blue-600">{adminData.ticketsOpened || 0}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <p className="text-sm text-gray-600 mb-1">التذاكر المحلولة</p>
            <p className="text-2xl font-bold text-green-600">{adminData.ticketsResolved || 0}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <p className="text-sm text-gray-600 mb-1">نسبة الحل</p>
            <p className="text-2xl font-bold text-purple-600">{adminData.ticketsResolvedPercent || 0}%</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <p className="text-sm text-gray-600 mb-1">متوسط وقت الاستجابة</p>
            <p className="text-2xl font-bold text-orange-600">{adminData.avgResponseTimeHours?.toFixed(1) || 0} ساعة</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4">توزيع أنواع التذاكر</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">العدد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {adminData.ticketTypesBreakdown && adminData.ticketTypesBreakdown.length > 0 ? (
                    adminData.ticketTypesBreakdown.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{item.type}</td>
                        <td className="px-4 py-3 text-gray-600">{item.count}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                        لا توجد بيانات
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4">توزيع الأقسام</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">القسم</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">العدد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {adminData.ticketDepartmentsBreakdown && adminData.ticketDepartmentsBreakdown.length > 0 ? (
                    adminData.ticketDepartmentsBreakdown.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{item.department}</td>
                        <td className="px-4 py-3 text-gray-600">{item.count}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                        لا توجد بيانات
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Risk & Attention Section */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            <h3 className="text-xl font-bold text-gray-800">المخاطر والانتباه</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <p className="text-sm text-gray-600 mb-1">متاجر انتهت اشتراكاتها</p>
            <p className="text-2xl font-bold text-red-600">{riskData.storesWithExpiredSubscriptions?.length || 0}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <p className="text-sm text-gray-600 mb-1">متاجر بإرجاع عالي</p>
            <p className="text-2xl font-bold text-orange-600">{riskData.storesWithHighRefunds?.length || 0}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <p className="text-sm text-gray-600 mb-1">كوبونات مستغلة</p>
            <p className="text-2xl font-bold text-yellow-600">{riskData.abusedCoupons?.length || 0}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <p className="text-sm text-gray-600 mb-1">متاجر بانخفاض طلبات</p>
            <p className="text-2xl font-bold text-purple-600">{riskData.storesWithDropInOrders?.length || 0}</p>
          </div>
        </div>

        {(riskData.storesWithExpiredSubscriptions?.length === 0 &&
          riskData.storesWithHighRefunds?.length === 0 &&
          riskData.abusedCoupons?.length === 0 &&
          riskData.storesWithDropInOrders?.length === 0) && (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">لا توجد مخاطر حالياً</p>
              <p className="text-sm text-gray-500 mb-6">جميع المتاجر تعمل بشكل طبيعي</p>
              <button
                onClick={() => window.location.href = '/dashboard/support'}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                <HelpCircle className="h-5 w-5" />
                الاتصال بالدعم
              </button>
            </div>
          )}
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">النشاطات الأخيرة</h2>
              <p className="text-sm text-gray-500">آخر التحديثات في النظام</p>
            </div>
          </div>
          <button className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-indigo-50 transition-all">
            عرض الكل →
          </button>
        </div>

        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-indigo-300 group cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${activity.color} shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <activity.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <span className="text-gray-800 font-bold block mb-1 text-lg">
                    {activity.action}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{activity.time}</span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    <span className="text-xs text-gray-400 capitalize">{activity.type}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                  عرض →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
