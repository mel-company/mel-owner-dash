import axiosInstance from '../utils/AxiosInstance';

export type AccountingTransactionType =
  | 'SUBSCRIPTION'
  | 'PAYMENT'
  | 'CREDITS'
  | 'INITIAL_SUBSCRIPTION'
  | 'RENEWAL'
  | 'CHANGE_PLAN'
  | 'DOMAIN_REGISTRATION'
  | string;

export type AccountingTransactionStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'EXPIRED'
  | 'PAID'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | string;

export interface AccountingTransaction {
  id: string;
  type: AccountingTransactionType;
  store?: {
    id: string;
    name: string | null;
  } | null;
  amount: number;
  date: string;
  status: AccountingTransactionStatus;
  method?: string | null;
  plan?: {
    id: string;
    name: string;
  } | null;
  provider?: string | null;
  refundedAmount?: number;
  canRefund?: boolean;
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

export type AccountingExportFormat = 'xlsx' | 'pdf';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
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

  exportTransactions: async (
    format: AccountingExportFormat,
    params?: Omit<AccountingTransactionsParams, 'page' | 'limit'>,
  ): Promise<void> => {
    const blob = (await axiosInstance.get('/accounting/transactions/export', {
      params: { ...params, format },
      responseType: 'blob',
    })) as unknown as Blob;

    const stamp = new Date().toISOString().slice(0, 10);
    const filename =
      format === 'pdf'
        ? `accounting-transactions-${stamp}.pdf`
        : `accounting-transactions-${stamp}.xlsx`;
    triggerDownload(blob, filename);
  },
};
