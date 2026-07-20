import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, ReceiptText, TrendingUp, Wallet } from 'lucide-react';
import {
  PageHeader,
  PrimaryActionButton,
  SearchFiltersBar,
  StatCard,
  StatusPill,
  TableShell,
  AlertMessage,
  LoadingState,
  Pagination,
} from '@/components/dashboard';
import { accountingService, type AccountingStats, type AccountingTransaction } from '../services/accountingService';

const Accounting = () => {
  const [transactions, setTransactions] = useState<AccountingTransaction[]>([]);
  const [stats, setStats] = useState<AccountingStats>({
    totalRevenue: 0,
    pendingAmount: 0,
    monthlyTransactions: 0,
    averageTransaction: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchAccounting = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [transactionsResponse, statsResponse] = await Promise.all([
        accountingService.getTransactions({
          page,
          limit: pageSize,
          search,
          type: typeFilter,
          status: statusFilter,
        }),
        accountingService.getStats(),
      ]);
      setTransactions(transactionsResponse.data || []);
      setTotal(transactionsResponse.total || transactionsResponse.data?.length || 0);
      setStats(statsResponse);
    } catch (err) {
      setError('فشل في جلب بيانات الحسابات المالية.');
      console.error('Error fetching accounting data:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchAccounting();
  }, [fetchAccounting]);

  const filteredTransactions = useMemo(() => transactions.filter((transaction) => {
    const matchesSearch = [transaction.store?.name, transaction.method, transaction.type].join(' ').toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  }), [search, transactions]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (loading && transactions.length === 0) return <LoadingState />;

  return (
    <div className="min-h-screen space-y-5 bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="الحسابات المالية"
        description={<>هناك <span className="font-black text-violet-600">{total} معاملة</span> في السجل المالي</>}
        icon={<Wallet className="h-6 w-6" />}
        action={<PrimaryActionButton>تصدير<Download className="h-4 w-4" /></PrimaryActionButton>}
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="إجمالي الإيرادات" value={`${stats.totalRevenue.toLocaleString()} د.ع`} icon={<Wallet />} tone="emerald" />
        <StatCard title="المعلقة" value={`${stats.pendingAmount.toLocaleString()} د.ع`} icon={<CalendarDays />} tone="amber" />
        <StatCard title="معاملات الشهر" value={stats.monthlyTransactions} icon={<ReceiptText />} tone="blue" />
        <StatCard title="متوسط المعاملة" value={`${stats.averageTransaction.toLocaleString()} د.ع`} icon={<TrendingUp />} tone="violet" />
      </div>

      <SearchFiltersBar
        search={search}
        onSearchChange={setSearch}
        placeholder="ابحث عن معاملة"
        filterCount={[typeFilter, statusFilter].filter(Boolean).length}
        onFilterClick={() => {
          setTypeFilter('');
          setStatusFilter('');
        }}
      >
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-12 rounded-2xl border border-slate-100 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm outline-none">
          <option value="">جميع المعاملات</option>
          <option value="PAYMENT">دفعات</option>
          <option value="SUBSCRIPTION">اشتراكات</option>
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-12 rounded-2xl border border-slate-100 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm outline-none">
          <option value="">جميع الحالات</option>
          <option value="COMPLETED">مكتمل</option>
          <option value="PENDING">قيد المعالجة</option>
          <option value="CANCELLED">ملغى</option>
        </select>
      </SearchFiltersBar>

      <TableShell
        footer={(
          <Pagination
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
          />
        )}
      >
        <table className="w-full min-w-[880px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
              <th className="px-5 py-5 text-right">المعاملة</th>
              <th className="px-5 py-5 text-right">المتجر</th>
              <th className="px-5 py-5 text-right">المبلغ</th>
              <th className="px-5 py-5 text-right">التاريخ</th>
              <th className="px-5 py-5 text-right">طريقة الدفع</th>
              <th className="px-5 py-5 text-right">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTransactions.map((transaction) => (
              <tr key={transaction.id} className="text-sm text-slate-700 transition hover:bg-slate-50/70">
                <td className="px-5 py-4 font-black text-slate-950">#{String(transaction.id).slice(0, 8)}</td>
                <td className="px-5 py-4 font-bold text-slate-800">{transaction.store?.name || '-'}</td>
                <td className="px-5 py-4 font-black text-violet-600">{transaction.amount.toLocaleString()} د.ع</td>
                <td className="px-5 py-4 text-slate-600">{formatDate(transaction.date)}</td>
                <td className="px-5 py-4 text-slate-600">{transaction.method || transaction.plan?.name || '-'}</td>
                <td className="px-5 py-4"><StatusPill tone={getStatusTone(transaction.status)}>{getStatusText(transaction.status)}</StatusPill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
};

const getStatusTone = (status: string): 'green' | 'amber' | 'red' | 'slate' => {
  if (status === 'COMPLETED') return 'green';
  if (status === 'PENDING') return 'amber';
  if (status === 'CANCELLED' || status === 'FAILED') return 'red';
  return 'slate';
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    COMPLETED: 'مكتمل',
    PENDING: 'قيد المعالجة',
    CANCELLED: 'ملغى',
    FAILED: 'فشل',
  };
  return map[status] || status;
};

const formatDate = (date: string) => new Date(date).toLocaleDateString('ar-IQ');

export default Accounting;
