import axiosInstance from '../utils/AxiosInstance';

export interface KeyKPIs {
  monthly_recurring_revenue?: number;
  annual_recurring_revenue?: number;
  total_revenue?: number;
  revenue_today?: number;
  revenue_this_month?: number;
  average_revenue_per_store?: number;
  stores_active_after_30_days_percent?: number;
}

export interface StoreMetrics {
  totalStores?: number;
  activeStores?: number;
  newStoresToday?: number;
  newStoresThisMonth?: number;
  storesWithoutProducts?: number;
  storesWithoutOrders?: number;
}

export interface OrdersPlatformUsage {
  totalOrders?: number;
  ordersToday?: number;
  ordersLast7Days?: number;
  averageOrderValue?: number;
  ordersPerStore?: number;
  orderSuccessRate?: number;
  cancelledOrders?: number;
  paymentSuccessCount?: number;
  paymentFailureCount?: number;
  couponUsageRate?: number;
}

export interface PaymentGateway {
  provider: string;
  code: string;
  count: number;
}

export interface DeliveryProvider {
  name: string;
  id: string;
  count: number;
}

export interface FeaturesAdoption {
  storesUsingCoupons?: number;
  storesUsingCouponsPercent?: number;
  storesUsingDeliveryIntegration?: number;
  storesUsingDeliveryIntegrationPercent?: number;
  storesUsingOnlinePayments?: number;
  storesUsingOnlinePaymentsPercent?: number;
  storesUsingCustomPages?: number;
  storesUsingCustomPagesPercent?: number;
  storesWithMultipleAdmins?: number;
  storesWithMultipleAdminsPercent?: number;
  mostUsedPaymentGateways?: PaymentGateway[];
  mostUsedDeliveryProviders?: DeliveryProvider[];
}

export interface RiskAttention {
  storesWithExpiredSubscriptions?: Array<{
    storeId: string;
    storeName: string;
    [key: string]: unknown;
  }>;
  storesWithHighRefunds?: Array<{
    storeId: string;
    storeName: string;
    [key: string]: unknown;
  }>;
  abusedCoupons?: Array<{
    couponId: string;
    couponCode: string;
    [key: string]: unknown;
  }>;
  storesWithDropInOrders?: Array<{
    storeId: string;
    storeName: string;
    [key: string]: unknown;
  }>;
}

export interface CountryOrder {
  countryId: string;
  countryName: string;
  orderCount: number;
  revenue: number;
}

export interface StateOrder {
  stateId: string;
  stateName: string;
  orderCount: number;
  revenue: number;
}

export interface RegionOrder {
  regionId: string;
  regionName: string;
  orderCount: number;
  revenue: number;
}

export interface GeographyMarketSignals {
  ordersByCountry?: CountryOrder[];
  revenueByCountry?: CountryOrder[];
  ordersByState?: StateOrder[];
  revenueByState?: StateOrder[];
  ordersByRegion?: RegionOrder[];
  revenueByRegion?: RegionOrder[];
  mostCommonCountry?: CountryOrder;
  mostActiveCountry?: CountryOrder;
  mostCommonState?: StateOrder;
  mostActiveState?: StateOrder;
  mostCommonRegion?: RegionOrder;
  mostActiveRegion?: RegionOrder;
}

export interface TicketTypeBreakdown {
  type: string;
  count: number;
}

export interface TicketDepartmentBreakdown {
  department: string;
  count: number;
}

export interface AdminProductivity {
  ticketsOpened?: number;
  ticketsResolved?: number;
  ticketsResolvedPercent?: number;
  avgResponseTimeHours?: number;
  mostTicketType?: {
    type: string;
    count: number;
  };
  mostSelectedDepartment?: {
    department: string;
    count: number;
  };
  ticketTypesBreakdown?: TicketTypeBreakdown[];
  ticketDepartmentsBreakdown?: TicketDepartmentBreakdown[];
  ticketSolverBreakdown?: Array<{
    solverId: string;
    solverName: string;
    count: number;
  }>;
}

/**
 * Owner Stats Service
 * Handles owner statistics endpoints
 */
export const ownerStatsService = {
  /**
   * الحصول على مؤشرات الأداء الرئيسية
   * GET /api/v1/owner-stats/key-kpis
   */
  getKeyKPIs: async (): Promise<KeyKPIs> => {
    const response = await axiosInstance.get<KeyKPIs>('/owner-stats/key-kpis');
    return response as unknown as KeyKPIs;
  },

  /**
   * الحصول على مقاييس المتاجر
   * GET /api/v1/owner-stats/store-metrics
   */
  getStoreMetrics: async (): Promise<StoreMetrics> => {
    const response = await axiosInstance.get<StoreMetrics>('/owner-stats/store-metrics');
    return response as unknown as StoreMetrics;
  },

  /**
   * الحصول على إحصائيات الطلبات واستخدام المنصة
   * GET /api/v1/owner-stats/orders-platform-usage
   */
  getOrdersPlatformUsage: async (): Promise<OrdersPlatformUsage> => {
    const response = await axiosInstance.get<OrdersPlatformUsage>('/owner-stats/orders-platform-usage');
    return response as unknown as OrdersPlatformUsage;
  },

  /**
   * الحصول على إحصائيات اعتماد الميزات
   * GET /api/v1/owner-stats/features-adoption
   */
  getFeaturesAdoption: async (): Promise<FeaturesAdoption> => {
    const response = await axiosInstance.get<FeaturesAdoption>('/owner-stats/features-adoption');
    return response as unknown as FeaturesAdoption;
  },

  /**
   * الحصول على مقاييس المخاطر والانتباه
   * GET /api/v1/owner-stats/risk-attention
   */
  getRiskAttention: async (): Promise<RiskAttention> => {
    const response = await axiosInstance.get<RiskAttention>('/owner-stats/risk-attention');
    return response as unknown as RiskAttention;
  },

  /**
   * الحصول على إشارات الجغرافيا والسوق
   * GET /api/v1/owner-stats/geography-market-signals
   */
  getGeographyMarketSignals: async (): Promise<GeographyMarketSignals> => {
    const response = await axiosInstance.get<GeographyMarketSignals>('/owner-stats/geography-market-signals');
    return response as unknown as GeographyMarketSignals;
  },

  /**
   * الحصول على مقاييس إنتاجية الإدارة
   * GET /api/v1/owner-stats/admin-productivity
   */
  getAdminProductivity: async (): Promise<AdminProductivity> => {
    const response = await axiosInstance.get<AdminProductivity>('/owner-stats/admin-productivity');
    return response as unknown as AdminProductivity;
  },
};
