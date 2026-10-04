import axiosInstance from '../utils/AxiosInstance';

/**
 * شركات الشحن — التكامل خلف الشركة، لا الشركة نفسها.
 *
 * Distinct from `deliveryCompanyService`, which is the *row* an operator
 * creates and prices: name, logo, fallback fees, and the zone mapping. This is
 * the integration behind that row — whether the platform can actually reach
 * the courier right now, and whether a given store is provisioned to ship with
 * it.
 *
 * Both halves are system-guarded on the server, so this dashboard is the only
 * thing that can call them. That is not incidental: the branch ids below are
 * created inside the platform's *own* account at the vendor, and a merchant
 * who could set them would be able to point their parcels at another
 * merchant's pick-up address.
 */

/** What a courier can be asked to do, read off the methods it implements. */
export interface CourierCapabilities {
  quote: boolean;
  createShipment: boolean;
  getShipment: boolean;
  track: boolean;
  cancelShipment: boolean;
  label: boolean;
  zoneCatalogue: boolean;
  webhook: boolean;
}

/** Who the courier is, for a merchant choosing one. */
export interface CourierProfile {
  code: string;
  nameAr: string;
  nameEn: string;
  logoUrl: string;
  website: string;
  /** What a merchant finds out at the wrong moment otherwise. */
  merchantNoteAr: string;
}

/**
 * Why a courier is unusable, in a form an operator can act on.
 *
 * `rejected` and `unreachable` are kept apart deliberately: a revoked key and
 * a vendor outage need completely different responses, and the courier's API
 * answers both with the same opaque error.
 */
export interface CourierHealthError {
  kind: 'credentials' | 'unreachable' | 'rejected' | 'unknown';
  reason: string;
  /** The vendor's own words, where it gave any. */
  detail?: string;
}

export interface CourierHealth {
  code: string;
  displayName: string;
  profile: CourierProfile;
  capabilities: CourierCapabilities;

  /** Every required variable for the chosen environment is set. */
  configured: boolean;
  /**
   * False when the courier is pointed at a vendor sandbox.
   *
   * A courier can pass every probe and still be unable to carry a real
   * parcel, and from the outside the two look identical. This is the only
   * place in the platform that says so.
   */
  production: boolean;
  environment: 'production' | 'sandbox';
  baseUrl: string;

  /** Which variables to set to switch it on. Names only, never values. */
  missingEnv: string[];
  presentEnv: string[];

  /** Configured, probed, and the probe passed. */
  ok: boolean;
  /** Whether a live call was actually made. */
  probed: boolean;
  error: CourierHealthError | null;
  checkedAt: string;
}

export interface CourierHealthSummary {
  total: number;
  ready: number;
  production: number;
  sandbox: number;
  unconfigured: number;
  broken: number;
}

export interface CourierHealthResponse {
  filter: 'all' | 'available' | 'configured';
  checkedAt: string;
  summary: CourierHealthSummary;
  couriers: CourierHealth[];
}

/** A store's identity at one courier. Never carries the password itself. */
export interface CourierAccountView {
  courierCode: string;
  active: boolean;
  merchantLoginId: string | null;
  senderId: number | null;
  pickUpAddressUid: string | null;
  username: string | null;
  /** Whether a password is stored. Never the password. */
  hasPassword: boolean;
  updatedAt: string | null;
}

export interface StoreCourierAccount {
  courierCode: string;
  displayName: string;
  /** Branch fields this courier refuses to dispatch without. */
  requiredBranchFields: string[];
  /**
   * Whether this deployment can store a merchant credential at all.
   *
   * False means `CREDENTIALS_ENCRYPTION_KEY` is unset or unusable. The two
   * couriers that can only be used under the merchant's own login — Modon
   * Express and Al-Waseet — are then stuck on the platform's account, and the
   * merchant's own settings page cannot offer the form.
   */
  canStoreCredentials: boolean;
  /**
   * Branch fields it reads but does not insist on.
   *
   * Sent by the server so this dashboard renders the right form without
   * holding its own copy of which courier takes which field.
   */
  optionalBranchFields: string[];
  /**
   * Whether the vendor can create a sub-account for a store **at all**.
   *
   * Not the same as an empty `requiredBranchFields`, which reads as "nothing
   * is needed yet" and invites an operator to wait for a step that does not
   * exist. False means the vendor publishes no sub-account endpoint — Modon
   * Express and Al-Waseet — so a branch is impossible rather than pending,
   * and the merchant's own courier login is the whole of the setup.
   */
  supportsBranches: boolean;
  /** The sentence shown in place of a form a courier cannot have. */
  branchNoteAr: string;
  /** Whether it accepts the merchant's own login at all. */
  acceptsMerchantCredentials: boolean;
  /** Null when this store was never provisioned at this courier. */
  account: CourierAccountView | null;
  accountReady: boolean;
  accountMissing: string[];
}

export interface SetCourierBranchPayload {
  merchantLoginId?: string | null;
  senderId?: number | null;
  pickUpAddressUid?: string | null;
  active?: boolean;
}

/**
 * How a courier is performing, counted from the parcels it carried.
 *
 * Every figure is read off the platform's own shipment records, not asked of
 * a vendor — three of the four publish no statistics API at all. So it is
 * only as fresh as the last webhook or sync, which is why `lastSyncedAt`
 * travels with it.
 */
export interface CourierStats {
  courierCode: string;
  total: number;
  delivered: number;
  inFlight: number;
  failed: number;
  returned: number;
  cancelled: number;
  unknown: number;
  /**
   * Delivered as a share of the parcels whose outcome is known.
   *
   * Null — not zero — when nothing has settled yet. A courier nobody has
   * results for is not a courier failing everything, and the table renders
   * the two differently on purpose.
   */
  deliveryRate: number | null;
  previousTotal: number;
  /** Change against the preceding window. Null when there was nothing to compare. */
  trend: number | null;
  lastSyncedAt: string | null;
}

export interface CourierStatsPoint {
  date: string;
  total: number;
  delivered: number;
}

export interface CourierRecentParcel {
  orderId: string;
  reference: string | null;
  externalId: string | null;
  status: string;
  rawStatus: string | null;
  createdAt: string;
  /** Days from registration to the last status held. Null while in flight. */
  processingDays: number | null;
}

export interface CourierDetailStats extends CourierStats {
  days: number;
  /** One point per day including the empty ones, so the shape is honest. */
  series: CourierStatsPoint[];
  recent: CourierRecentParcel[];
}

export const courierService = {
  /**
   * كل شركات الشحن وحالتها. GET /shipping/couriers/health
   *
   * Every entry is a live authenticated call to the vendor, cached for a
   * minute on the server — Al-Waseet allows thirty requests per thirty
   * seconds and the zone sync shares that budget.
   */
  getHealth: async (
    filter: 'all' | 'available' | 'configured' = 'all',
  ): Promise<CourierHealthResponse> => {
    const response = await axiosInstance.get('/shipping/couriers/health', {
      params: { filter },
    });
    return response as unknown as CourierHealthResponse;
  },

  /**
   * فحص شركة واحدة متجاوزًا الذاكرة المؤقتة.
   * GET /shipping/couriers/health/:code
   *
   * Probes on every call, so this is the one to use right after changing a
   * credential — the list above would serve the stale answer for a minute.
   */
  checkCourier: async (code: string): Promise<CourierHealth> => {
    const response = await axiosInstance.get(
      `/shipping/couriers/health/${code}`,
    );
    return response as unknown as CourierHealth;
  },

  /** إسقاط الذاكرة المؤقتة. POST /shipping/couriers/health/refresh */
  refreshHealth: async (): Promise<void> => {
    await axiosInstance.post('/shipping/couriers/health/refresh');
  },

  /**
   * أداء كل شركة خلال مدة. GET /shipping/couriers/stats
   *
   * No network call to any vendor — these are counted from the platform's own
   * parcel records, so the page can show them beside a health probe without
   * doubling the cost of loading it.
   */
  getStats: async (days = 30): Promise<CourierStats[]> => {
    const response = await axiosInstance.get('/shipping/couriers/stats', {
      params: { days },
    });
    return response as unknown as CourierStats[];
  },

  /** شركة واحدة مع سلسلة يومية وآخر طرودها. GET /shipping/couriers/:code/stats */
  getCourierStats: async (
    code: string,
    days = 30,
    recent = 5,
  ): Promise<CourierDetailStats> => {
    const response = await axiosInstance.get(
      `/shipping/couriers/${code}/stats`,
      { params: { days, recent } },
    );
    return response as unknown as CourierDetailStats;
  },

  /**
   * ما الذي هيّأه هذا المتجر لدى كل شركة.
   * GET /shipping/stores/:storeId/couriers/accounts
   *
   * Lists couriers with no account row too, which is the point: an absence is
   * exactly the state in which Prime and Boxy refuse every parcel.
   */
  getStoreAccounts: async (storeId: string): Promise<StoreCourierAccount[]> => {
    const response = await axiosInstance.get(
      `/shipping/stores/${storeId}/couriers/accounts`,
    );
    return response as unknown as StoreCourierAccount[];
  },

  /**
   * تسجيل فرع المتجر داخل حساب المنصة لدى الشركة.
   * PUT /shipping/stores/:storeId/couriers/:code/branch
   *
   * Prime wants the shop id from `create-merchant-shop` as `senderId`; Boxy
   * wants the uid of this merchant's pick-up location. Both refuse to
   * dispatch without one rather than falling back to a default, because the
   * default would collect from another merchant's address.
   */
  setBranch: async (
    storeId: string,
    code: string,
    payload: SetCourierBranchPayload,
  ): Promise<CourierAccountView> => {
    const response = await axiosInstance.put(
      `/shipping/stores/${storeId}/couriers/${code}/branch`,
      payload,
    );
    return response as unknown as CourierAccountView;
  },
};

export default courierService;
