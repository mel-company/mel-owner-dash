import axiosInstance from '../utils/AxiosInstance';

export type AccountingTransactionType = 'SUBSCRIPTION' | 'PAYMENT' | string;
export type AccountingTransactionStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | string;

export interface AccountingTransaction {
  id: string;
  type: AccountingTransactionType;
  store?: {
    id: string;
    name: string;
  } | null;
  amount: number;
  date: string;
  status: AccountingTransactionStatus;
  method?: string | null;
  plan?: {
    id: string;
    name: string;
  } | null;
}

export interface AccountingTransactionsResponse {
  data: AccountingTransaction[];
  total: number;
  page?: number;
  limit?: number;
}

export interface AccountingTransactionsParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
  from?: string;
  to?: string;
}

export interface AccountingStats {
  totalRevenue: number;
  pendingAmount: number;
  monthlyTransactions: number;
  averageTransaction: number;
}

export const accountingService = {
  getTransactions: async (params?: AccountingTransactionsParams): Promise<AccountingTransactionsResponse> => {
    const response = await axiosInstance.get<AccountingTransactionsResponse>('/accounting/transactions', { params });
    return response as unknown as AccountingTransactionsResponse;
  },

  getStats: async (): Promise<AccountingStats> => {
    const response = await axiosInstance.get<AccountingStats>('/accounting/stats');
    return response as unknown as AccountingStats;
  },
};
