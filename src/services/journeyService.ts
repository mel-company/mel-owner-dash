import axiosInstance from '../utils/AxiosInstance';

/**
 * Visitor journey: landing-page visitors through to paying merchants.
 *
 * The first two steps are anonymous visitors counted by mel.iq itself (no
 * cookies, no IP). From «أنشأوا حساباً» on, the numbers are the accounts
 * created in the range and how far each has got by now.
 */
export interface JourneyStep {
  key: string;
  label: string;
  count: number;
  note: string;
}

export interface JourneyFunnel {
  range: { from: string; to: string; days: number };
  /** When the landing page first reported a visit; null if it never has. */
  trackingSince: string | null;
  steps: JourneyStep[];
  daily: Array<{ day: string; visitors: number; accounts: number }>;
  sources: Array<{ source: string; visits: number }>;
  devices: Array<{ device: string; visits: number }>;
  /** Null city or country: visits from before places were recorded. */
  cities?: Array<{ city: string | null; country: string | null; visits: number }>;
  countries?: Array<{ country: string | null; visits: number }>;
  browsers?: Array<{ browser: string | null; visits: number }>;
  systems?: Array<{ os: string | null; visits: number }>;
  languages?: Array<{ language: string | null; visits: number }>;
  /** First visits of the day by Baghdad hour, 0-23. */
  hours?: Array<{ hour: number; visits: number }>;
}

export const journeyService = {
  /** `from`/`to` are inclusive Baghdad days, `YYYY-MM-DD`. */
  async funnel(params: { from?: string; to?: string } = {}): Promise<JourneyFunnel> {
    // The interceptor already unwraps `response.data`.
    const response = await axiosInstance.get<JourneyFunnel>('/journey/funnel', { params });
    return response as unknown as JourneyFunnel;
  },
};

export interface JourneyAccount {
  id: string;
  name: string | null;
  phone: string | null;
  createdAt: string;
  store: { id: string; name: string | null; subdomain: string | null } | null;
  /** Keys of the account steps this account has reached. */
  steps: string[];
}

export interface JourneyAccountsPage {
  total: number;
  page: number;
  pageSize: number;
  steps: Array<{ key: string; label: string }>;
  data: JourneyAccount[];
}

export const journeyAccountsService = {
  /** Accounts created in the range; `step` keeps only those that reached it. */
  async list(params: { from?: string; to?: string; step?: string; page?: number; pageSize?: number }): Promise<JourneyAccountsPage> {
    // The interceptor already unwraps `response.data`.
    const response = await axiosInstance.get<JourneyAccountsPage>('/journey/accounts', { params });
    return response as unknown as JourneyAccountsPage;
  },
};

export interface JourneyVisit {
  id: string;
  createdAt: string;
  path: string | null;
  source: string;
  device: string | null;
  country: string | null;
  city: string | null;
  browser: string | null;
  os: string | null;
  language: string | null;
  /** This visitor also reached the signup page in the range. */
  openedSignup: boolean;
  /** Days this browser has visited mel.iq; more than 1 means returning. */
  daysVisited: number;
}

export interface JourneyVisitsPage {
  total: number;
  page: number;
  pageSize: number;
  data: JourneyVisit[];
}

export const journeyVisitorsService = {
  /** Landing visits in the range, newest first: one row per visitor per day. */
  async list(params: { from?: string; to?: string; page?: number; pageSize?: number }): Promise<JourneyVisitsPage> {
    // The interceptor already unwraps `response.data`.
    const response = await axiosInstance.get<JourneyVisitsPage>('/journey/visitors', { params });
    return response as unknown as JourneyVisitsPage;
  },
};
