import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileSearch, FileText, ReceiptText, Wallet } from 'lucide-react';
import {
  AlertMessage,
  EmptyState,
  FormField,
  LoadingState,
  PageHeader,
  Pagination,
  PrimaryActionButton,
  SelectField,
  SideDrawer,
  StatCard,
  StatusPill,
  TableShell,
} from '@/components/dashboard';
import { cn } from '@/lib/utils';
import {
  accountingService,
  type AccountingStats,
  type AccountingTransaction,
} from '../services/accountingService';

type FiltersState = {
  type: string;
  method: string;
  status: string;
  amount: string;
  dateFrom: string;
  dateTo: string;
};

type CardBrand = 'visa' | 'mastercard' | 'gpay' | 'bank';

const defaultFilters: FiltersState = {
  type: '',
  method: '',
  status: '',
  amount: '',
  dateFrom: '',
  dateTo: '',
};

const typeOptions = [
  { value: '', label: 'الكل' },
  { value: 'SUBSCRIPTION', label: 'أشتراك' },
  { value: 'PAYMENT', label: 'دفعة' },
];

const methodOptions = [
  { value: '', label: 'الكل' },
  { value: 'bank', label: 'تحويل بنكي' },
  { value: 'card', label: 'بطاقة ائتمانية' },
  { value: 'electronic', label: 'دفع الكتروني' },
];

const statusOptions = [
  { value: '', label: 'الكل' },
  { value: 'COMPLETED', label: 'مكتملة' },
  { value: 'PENDING', label: 'قيد المراجعة' },
  { value: 'CANCELLED', label: 'غير مدفوع' },
];

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
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<FiltersState>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
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
          type: filters.type || undefined,
          status: filters.status || undefined,
          from: filters.dateFrom || undefined,
          to: filters.dateTo || undefined,
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
  }, [filters.dateFrom, filters.dateTo, filters.status, filters.type, page, pageSize, search]);

  useEffect(() => {
    fetchAccounting();
  }, [fetchAccounting]);

  const visibleTransactions = useMemo(() => transactions.filter((transaction) => {
    const methodKey = getMethodKey(transaction);
    const matchesMethod = !filters.method || methodKey === filters.method;
    const matchesAmount = !filters.amount || String(transaction.amount).includes(filters.amount.replace(/[^\d]/g, ''));
    const searchable = [transaction.store?.name, transaction.method, transaction.type, transaction.id]
      .join(' ')
      .toLowerCase();
    const matchesSearch = searchable.includes(search.trim().toLowerCase());
    return matchesMethod && matchesAmount && matchesSearch;
  }), [filters.amount, filters.method, search, transactions]);

  const pendingCount = useMemo(
    () => transactions.filter((item) => item.status === 'PENDING').length,
    [transactions]
  );

  const filterCount = [
    filters.type,
    filters.method,
    filters.status,
    filters.amount,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  const totalPages = Math.max(1, Math.ceil((total || visibleTransactions.length || 1) / pageSize));
  const listCount = total || visibleTransactions.length;
  const listTitle = search || filterCount > 0 ? 'نتائج البحث والفلاتر' : 'قائمة الحسابات المالية';

  if (loading && transactions.length === 0) return <LoadingState />;

  return (
    <div className="min-h-screen space-y-5 bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="الحسابات المالية"
        description={(
          <>
            هناك <span className="font-black text-violet-600">{listCount}</span> دفعة في قائمة الحسابات المالية
          </>
        )}
        icon={<Wallet className="h-6 w-6" />}
        action={(
          <PrimaryActionButton>
            تصدير القائمة
            <img src="/accounting/export.svg" alt="" className="h-5 w-5 brightness-0 invert" />
          </PrimaryActionButton>
        )}
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <RevenueCard value={stats.totalRevenue} />
        <StatCard
          title="المعاملات لهذا الشهر"
          value={stats.monthlyTransactions.toLocaleString()}
          icon={<FileText />}
          tone="blue"
          hint="12.6% ↗"
        />
        <StatCard
          title="عدد المعاملات المعلقة"
          value={(
            <>
              {pendingCount} <span className="text-sm font-bold text-slate-500">معاملة</span>
            </>
          )}
          icon={<FileSearch />}
          tone="amber"
          hint={null}
        />
        <StatCard
          title="المعاملات المعلقة"
          value={(
            <>
              {stats.pendingAmount.toLocaleString()} <span className="text-sm font-bold text-slate-500">د.ع</span>
            </>
          )}
          icon={<ReceiptText />}
          tone="amber"
          hint="0% ↗"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-slate-900">{listTitle}</h2>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDraftFilters(filters);
              setShowFilters(true);
            }}
            className={cn(
              'view-button relative inline-flex items-center gap-2',
              filterCount > 0 && 'border-violet-300 bg-violet-600 text-white'
            )}
          >
            الفلاتر
            <img
              src="/accounting/filter.svg"
              alt=""
              className={cn('h-5 w-5', filterCount > 0 && 'brightness-0 invert')}
            />
            {filterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                +{filterCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100">
            <button type="button" className="h-10 rounded-xl bg-cyan-50 px-5 text-sm font-bold text-cyan-500">
              البحث
            </button>
            <div className="relative flex min-w-[220px] items-center gap-2 px-2">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="ابحث عن المتاجر"
                className="h-10 w-full rounded-xl border-0 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
              />
              <img src="/accounting/search.svg" alt="" className="h-[18px] w-[18px] shrink-0 opacity-50" />
            </div>
          </div>
        </div>
      </div>

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
        {visibleTransactions.length === 0 ? (
          <EmptyState title="لا توجد معاملات مالية" />
        ) : (
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
                <th className="px-5 py-5 text-right">#</th>
                <th className="px-5 py-5 text-right">المعاملة</th>
                <th className="px-5 py-5 text-right">المتجر</th>
                <th className="px-5 py-5 text-right">مبلغ الدفع</th>
                <th className="px-5 py-5 text-right">تاريخ الدفع</th>
                <th className="px-5 py-5 text-right">طريقة الدفع</th>
                <th className="px-5 py-5 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleTransactions.map((transaction, index) => {
                const status = getStatusMeta(transaction.status);
                const method = getMethodMeta(transaction);
                const txnLabel = getTransactionLabel(transaction);
                return (
                  <tr key={transaction.id} className="text-sm text-slate-700 transition hover:bg-slate-50/70">
                    <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                      {String((page - 1) * pageSize + index + 1).padStart(2, '0')}
                    </td>
                    <td className="px-5 py-4 font-black text-slate-950">{txnLabel}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <StoreAvatar name={transaction.store?.name || 'متجر'} />
                        <span className="font-bold text-slate-800">{transaction.store?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-black text-slate-950">
                      {transaction.amount.toLocaleString()} <span className="text-xs font-bold text-slate-400">د.ع</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(transaction.date)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <PaymentMethodIcon brand={method.brand} />
                        <span className="font-semibold text-slate-700">{method.label}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableShell>

      {showFilters && (
        <SideDrawer
          title="الفلاتر"
          icon={<FileSearch className="h-6 w-6" />}
          maxWidth="max-w-3xl"
          onClose={() => setShowFilters(false)}
          footer={(
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setDraftFilters(defaultFilters);
                  setFilters(defaultFilters);
                  setShowFilters(false);
                  setPage(1);
                }}
                className="h-14 rounded-2xl bg-slate-100 font-black text-slate-600"
              >
                الغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters(draftFilters);
                  setShowFilters(false);
                  setPage(1);
                }}
                className="h-14 rounded-2xl bg-linear-to-l from-violet-700 to-fuchsia-500 font-black text-white shadow-lg shadow-violet-200"
              >
                تطبيق الفلاتر
              </button>
            </div>
          )}
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <SelectField
              label="نوع المعاملة"
              value={draftFilters.type}
              options={typeOptions}
              onChange={(value) => setDraftFilters((current) => ({ ...current, type: value }))}
            />
            <FormField
              label="مبلغ الدفع"
              value={draftFilters.amount}
              placeholder="25,500 د.ع"
              onChange={(value) => setDraftFilters((current) => ({ ...current, amount: value }))}
            />
            <SelectField
              label="نوع عملية الدفع"
              value={draftFilters.method}
              options={methodOptions}
              onChange={(value) => setDraftFilters((current) => ({ ...current, method: value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="من تاريخ"
                type="date"
                value={draftFilters.dateFrom}
                onChange={(value) => setDraftFilters((current) => ({ ...current, dateFrom: value }))}
              />
              <FormField
                label="إلى تاريخ"
                type="date"
                value={draftFilters.dateTo}
                onChange={(value) => setDraftFilters((current) => ({ ...current, dateTo: value }))}
              />
            </div>
            <SelectField
              label="حالة العملية"
              value={draftFilters.status}
              options={statusOptions}
              onChange={(value) => setDraftFilters((current) => ({ ...current, status: value }))}
            />
          </div>
        </SideDrawer>
      )}
    </div>
  );
};

const RevenueCard = ({ value }: { value: number }) => (
  <div
    className="relative flex min-h-[88px] items-center justify-between gap-4 overflow-hidden rounded-[1.75rem] px-5 py-4 text-white shadow-[0_16px_40px_rgba(125,38,247,0.28)]"
    style={{ backgroundImage: 'linear-gradient(200deg, #b657ff 24%, #00bfff 76%)' }}
  >
    <img
      src="/accounting/wallet-bg.svg"
      alt=""
      className="pointer-events-none absolute -left-4 top-1/2 h-[110px] w-[110px] -translate-y-1/2 opacity-30"
    />
    <div className="relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/80 bg-white/20 shadow-lg">
      <img src="/accounting/money.svg" alt="" className="h-7 w-7 brightness-0 invert" />
    </div>
    <div className="relative z-10 min-w-0 flex-1 text-right">
      <p className="text-sm font-black text-white/90">أجمالي الايرادات</p>
      <p className="mt-1.5 text-2xl font-black leading-none">{value.toLocaleString()} د.ع</p>
    </div>
  </div>
);

const StoreAvatar = ({ name }: { name: string }) => (
  <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-violet-50 text-sm font-black text-violet-600 ring-1 ring-slate-100">
    {name.slice(0, 1)}
  </div>
);

const PaymentMethodIcon = ({ brand }: { brand: CardBrand }) => {
  if (brand === 'bank') {
    return (
      <span className="grid h-6 w-10 place-items-center">
        <img src="/accounting/bank.svg" alt="" className="h-5 w-5" />
      </span>
    );
  }

  if (brand === 'gpay') {
    return (
      <span className="relative grid h-6 w-10 place-items-center overflow-hidden rounded bg-white ring-1 ring-slate-100">
        <img src="/accounting/gpay-g.svg" alt="" className="absolute left-1 top-1 h-3.5 w-3.5" />
        <img src="/accounting/gpay-text.svg" alt="" className="absolute right-1 top-1.5 h-3 w-5" />
      </span>
    );
  }

  if (brand === 'mastercard') {
    return (
      <span className="relative flex h-6 w-10 items-center justify-center overflow-hidden rounded bg-white ring-1 ring-slate-100">
        <img src="/accounting/mastercard.svg" alt="" className="h-4 w-7" />
      </span>
    );
  }

  return (
    <span className="relative flex h-6 w-10 items-center justify-center overflow-hidden rounded bg-white ring-1 ring-slate-100">
      <img src="/accounting/visa.svg" alt="" className="h-3 w-7" />
    </span>
  );
};

const getMethodKey = (transaction: AccountingTransaction): 'bank' | 'card' | 'electronic' => {
  const raw = `${transaction.method || ''} ${transaction.plan?.name || ''}`.toLowerCase();
  if (raw.includes('bank') || raw.includes('تحويل') || raw.includes('wire')) return 'bank';
  if (raw.includes('google') || raw.includes('electronic') || raw.includes('الكتروني') || raw.includes('gpay')) {
    return 'electronic';
  }
  if (raw.includes('card') || raw.includes('visa') || raw.includes('master') || raw.includes('بطاقة')) return 'card';
  return transaction.type === 'SUBSCRIPTION' ? 'bank' : 'card';
};

const getCardBrand = (transaction: AccountingTransaction, methodKey: 'bank' | 'card' | 'electronic'): CardBrand => {
  if (methodKey === 'bank') return 'bank';
  if (methodKey === 'electronic') return 'gpay';

  const raw = `${transaction.method || ''}`.toLowerCase();
  if (raw.includes('master')) return 'mastercard';
  if (raw.includes('visa')) return 'visa';
  if (raw.includes('google') || raw.includes('gpay')) return 'gpay';

  const hash = [...String(transaction.id)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return hash % 2 === 0 ? 'mastercard' : 'visa';
};

const getMethodMeta = (transaction: AccountingTransaction) => {
  const key = getMethodKey(transaction);
  const labels = {
    bank: 'تحويل بنكي',
    card: 'بطاقة ائتمانية',
    electronic: 'بطاقة ائتمانية',
  } as const;
  return { key, label: labels[key], brand: getCardBrand(transaction, key) };
};

const getTransactionLabel = (transaction: AccountingTransaction) => {
  const digits = String(transaction.id).replace(/\D/g, '').slice(-2) || '01';
  const kind = transaction.type === 'SUBSCRIPTION' ? 'أشتراك' : 'دفعة';
  return `${kind} #${digits}`;
};

const getStatusMeta = (status: string) => {
  if (status === 'COMPLETED') return { label: 'مكتمل', tone: 'green' as const };
  if (status === 'PENDING') return { label: 'قيد المراجعة', tone: 'amber' as const };
  if (status === 'CANCELLED' || status === 'FAILED') return { label: 'غير مدفوع', tone: 'red' as const };
  return { label: status || 'غير محدد', tone: 'slate' as const };
};

const formatDate = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

export default Accounting;
