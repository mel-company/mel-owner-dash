import { useCallback, useEffect, useState } from 'react';
import { CreditCard, FileSearch, FileText, ReceiptText, Wallet, X } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  accountingService,
  type AccountingStats,
  type AccountingTransaction,
} from '../services/accountingService';
import { platformPaymentService } from '../services/platformPaymentService';
import {
  asPaymentMethodFilter,
  describePaymentMethod,
  PAYMENT_METHOD_FILTERS,
  type PaymentMethodArt,
  type PaymentMethodCategory,
} from '@/lib/payment-method';

type FiltersState = {
  type: string;
  /**
   * The union rather than `string`, so a value the server would refuse cannot
   * be put in here. The server answers `400` for a bucket it does not serve —
   * deliberately, so a mismatch between the two surfaces is a loud error
   * rather than an empty table nobody can explain — and this is what stops
   * the client being the one that causes it.
   */
  method: '' | PaymentMethodCategory;
  status: string;
  amount: string;
  dateFrom: string;
  dateTo: string;
};

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
    pendingTransactions: 0,
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
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [refundTarget, setRefundTarget] = useState<AccountingTransaction | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMessage, setRefundMessage] = useState('');
  const [refunding, setRefunding] = useState(false);

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
          // Every filter goes to the server. Narrowing the page we were
          // handed is what made the pager offer five pages of nothing.
          method: filters.method || undefined,
          amount: filters.amount || undefined,
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
  }, [
    filters.amount,
    filters.dateFrom,
    filters.dateTo,
    filters.method,
    filters.status,
    filters.type,
    page,
    pageSize,
    search,
  ]);

  useEffect(() => {
    fetchAccounting();
  }, [fetchAccounting]);

  /**
   * What the server sent, rendered as sent.
   *
   * This page used to re-filter and re-count the rows it had been given, which
   * is only ever correct for an unpaginated list: `method` and `amount` were
   * applied to the ten rows on screen while `total` and the pager counted the
   * whole table, so a filter emptied page one and still offered the rest, and
   * matches further in were unreachable. `search` was applied twice — once by
   * the server and again here. The server owns all of it now.
   */

  /**
   * The narrowed state, as something you can see and undo.
   *
   * Worth building only because the filters now reach the whole table: while
   * they narrowed the page in hand, "23 معاملة" and a badge reading "2" were
   * describing different things and neither was the truth. Now the count is
   * real, so what produced it should be legible without reopening the drawer
   * — and removable one at a time, which the drawer cannot do.
   */
  const activeFilters: Array<{ key: keyof FiltersState; label: string }> = [
    filters.type && {
      key: 'type' as const,
      label: typeOptions.find((option) => option.value === filters.type)?.label ?? filters.type,
    },
    filters.method && {
      key: 'method' as const,
      label:
        PAYMENT_METHOD_FILTERS.find((option) => option.value === filters.method)?.label ??
        filters.method,
    },
    filters.status && {
      key: 'status' as const,
      label:
        statusOptions.find((option) => option.value === filters.status)?.label ?? filters.status,
    },
    filters.amount && { key: 'amount' as const, label: `المبلغ يحتوي ${filters.amount}` },
    filters.dateFrom && { key: 'dateFrom' as const, label: `من ${filters.dateFrom}` },
    filters.dateTo && { key: 'dateTo' as const, label: `إلى ${filters.dateTo}` },
  ].filter(Boolean) as Array<{ key: keyof FiltersState; label: string }>;

  const filterCount = activeFilters.length;

  /** Clearing one chip re-fetches from the first page: the result set changed. */
  const clearFilter = (key: keyof FiltersState) => {
    setFilters((current) => ({ ...current, [key]: '' }));
    setDraftFilters((current) => ({ ...current, [key]: '' }));
    setPage(1);
  };

  const clearAllFilters = () => {
    setFilters(defaultFilters);
    setDraftFilters(defaultFilters);
    setSearch('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil((total || transactions.length || 1) / pageSize));
  const listCount = total || transactions.length;
  const listTitle = search || filterCount > 0 ? 'نتائج البحث والفلاتر' : 'قائمة الحسابات المالية';

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    try {
      setExporting(true);
      setShowExportMenu(false);
      setError('');
      await accountingService.exportTransactions(format, {
        search: search || undefined,
        type: filters.type || undefined,
        status: filters.status || undefined,
        from: filters.dateFrom || undefined,
        to: filters.dateTo || undefined,
        // The operator pressed export *because* they had narrowed the view.
        method: filters.method || undefined,
        amount: filters.amount || undefined,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل في تصدير القائمة.');
      console.error('Error exporting accounting list:', err);
    } finally {
      setExporting(false);
    }
  };

  const remainingRefund = (transaction: AccountingTransaction) =>
    Math.max(0, (transaction.amount ?? 0) - (transaction.refundedAmount ?? 0));

  const openRefund = (transaction: AccountingTransaction) => {
    const remaining = remainingRefund(transaction);
    setRefundTarget(transaction);
    setRefundAmount(remaining > 0 ? String(remaining) : '');
    setRefundMessage('');
  };

  const closeRefund = () => {
    if (refunding) return;
    setRefundTarget(null);
    setRefundAmount('');
    setRefundMessage('');
  };

  const submitRefund = async () => {
    if (!refundTarget) return;
    const remaining = remainingRefund(refundTarget);
    const amount = Number(refundAmount.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('أدخل مبلغ استرجاع صحيح.');
      return;
    }
    if (amount > remaining) {
      setError(`المبلغ أكبر من المتبقي (${remaining.toLocaleString()} د.ع).`);
      return;
    }

    try {
      setRefunding(true);
      setError('');
      await platformPaymentService.refund(refundTarget.id, {
        amount,
        message: refundMessage.trim() || undefined,
      });
      setRefundTarget(null);
      setRefundAmount('');
      setRefundMessage('');
      await fetchAccounting();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(' — ')
          : typeof message === 'string'
            ? message
            : err instanceof Error
              ? err.message
              : 'فشل الاسترجاع.',
      );
      console.error('Error refunding platform payment:', err);
    } finally {
      setRefunding(false);
    }
  };

  if (loading && transactions.length === 0) return <LoadingState />;

  return (
    <div className="page-shell bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="الحسابات المالية"
        description={(
          <>
            هناك <span className="font-black text-violet-600">{listCount}</span> دفعة في قائمة الحسابات المالية
          </>
        )}
        icon={<Wallet className="h-5 w-5 sm:h-6 sm:w-6" />}
        action={(
          <div className="relative">
            <PrimaryActionButton
              onClick={() => setShowExportMenu((open) => !open)}
              className={exporting ? 'pointer-events-none opacity-70' : undefined}
            >
              {exporting ? 'جاري التصدير...' : 'تصدير القائمة'}
              <img src="/accounting/export.svg" alt="" className="h-5 w-5 brightness-0 invert" />
            </PrimaryActionButton>
            {showExportMenu && !exporting && (
              <div className="absolute left-0 top-full z-20 mt-2 min-w-44 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1 shadow-xl shadow-slate-200/80">
                <button
                  type="button"
                  onClick={() => handleExport('xlsx')}
                  className="block w-full px-4 py-2.5 text-right text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
                >
                  Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  className="block w-full px-4 py-2.5 text-right text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
                >
                  PDF (.pdf)
                </button>
              </div>
            )}
          </div>
        )}
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      {/*
        Three cards, not four.
        «عدد المعاملات المعلقة» and «المعاملات المعلقة» were the same fact
        twice — a count and an amount, competing for attention as peers. The
        amount is what an operator is chasing, so it is the headline and the
        count is what it is made of.
      */}
      <div className="grid grid-cols-2 max-sm:[&>*:first-child]:col-span-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        <RevenueCard value={stats.totalRevenue} />
        <StatCard
          title="المعاملات لهذا الشهر"
          value={stats.monthlyTransactions.toLocaleString()}
          icon={<FileText />}
          tone="blue"
          /**
           * No `hint`.
           *
           * This card carried `hint="12.6% ↗"` — a growth figure typed into
           * the markup, rendered in the same place and the same style as the
           * real numbers beside it. Nothing computes it and nothing ever did;
           * it survived from a mockup. A number an operator cannot trust next
           * to three they can is worse than no number, and it is a large part
           * of why this page is hard to read. The average-transaction card
           * carried `hint="0% ↗"` for the same reason.
           *
           * A real month-over-month delta is worth having and needs the
           * server to return last month's totals — a follow-up, not a string.
           */
          hint={null}
        />
        <StatCard
          title="قيد المراجعة"
          value={(
            <>
              {stats.pendingAmount.toLocaleString()} <span className="text-sm font-bold text-slate-500">د.ع</span>
            </>
          )}
          icon={<ReceiptText />}
          tone="amber"
          hint={null}
          sub={`موزّعة على ${stats.pendingTransactions.toLocaleString()} معاملة`}
        />
      </div>

      <div className="toolbar-row">
        <h2 className="text-lg font-black text-slate-900 sm:text-xl">{listTitle}</h2>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => {
              setDraftFilters(filters);
              setShowFilters(true);
            }}
            className={cn(
              'view-button relative inline-flex items-center justify-center gap-2',
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

          <div className="search-chip" dir="ltr">
            <button type="button" className="h-9 shrink-0 rounded-xl bg-cyan-50 px-4 text-sm font-bold text-cyan-500 sm:h-10 sm:px-5">
              البحث
            </button>
            <div className="relative flex min-w-0 flex-1 items-center gap-2 px-2 sm:min-w-[200px]">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="ابحث عن المتاجر"
                className="h-9 w-full rounded-xl border-0 bg-transparent text-right text-sm font-semibold outline-none placeholder:text-slate-400 sm:h-10"
                dir="rtl"
              />
              <img src="/accounting/search.svg" alt="" className="h-[18px] w-[18px] shrink-0 opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {(filterCount > 0 || search) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500">يُعرض:</span>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 transition hover:bg-violet-100"
            >
              <span>بحث: {search}</span>
              <X className="h-3 w-3" strokeWidth={3} />
            </button>
          )}
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => clearFilter(filter.key)}
              className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 transition hover:bg-violet-100"
            >
              <span>{filter.label}</span>
              <X className="h-3 w-3" strokeWidth={3} />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="px-1 py-1.5 text-xs font-bold text-slate-500 underline transition hover:text-slate-700"
          >
            مسح الكل
          </button>
        </div>
      )}

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
        {transactions.length === 0 ? (
          <EmptyState title="لا توجد معاملات مالية" />
        ) : (
          <table className="w-full min-w-[1080px]">
            <thead>
              {/*
                Six columns, down from eight.

                The `#` column numbered the *page* — `(page - 1) * pageSize +
                index + 1` — so the same record was 01 on page one and 11 on
                page two. It identified nothing and cost a column.

                «تاريخ الدفع» moved under the transaction label, where it reads
                as a property of the thing rather than a column to scan, and
                «إجراء» lost its header: one button, named by itself.
              */}
              <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
                <th className="px-5 py-5 text-right">المعاملة</th>
                <th className="px-5 py-5 text-right">المتجر</th>
                <th className="px-5 py-5 text-right">طريقة الدفع</th>
                <th className="px-5 py-5 text-left">المبلغ</th>
                <th className="px-5 py-5 text-right">الحالة</th>
                <th className="px-5 py-5 text-right"><span className="sr-only">إجراء</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((transaction) => {
                const status = getStatusMeta(transaction.status);
                const method = describePaymentMethod(transaction);
                const txnLabel = getTransactionLabel(transaction);
                return (
                  <tr key={transaction.id} className="text-sm text-slate-700 transition hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="font-black text-slate-950">{txnLabel}</div>
                      <div className="text-xs font-semibold text-slate-400">{formatDate(transaction.date)}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <StoreAvatar name={transaction.store?.name || 'متجر'} />
                        <span className="font-bold text-slate-800">{transaction.store?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <PaymentMethodIcon art={method.art} />
                        <div className="leading-tight">
                          <div className="font-semibold text-slate-700">{method.label}</div>
                          {method.maskedPan ? (
                            <div className="font-mono text-[11px] text-slate-400">{method.maskedPan}</div>
                          ) : method.network === null && method.category !== 'bank' ? (
                            // The gateway's own brand, when it never named a
                            // network. Said rather than guessed.
                            <div className="text-[11px] text-slate-400">
                              {transaction.provider === 'QI_CARD' ? 'كي كارد' : 'زين كاش'}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    {/*
                      The amount is what a financial table is scanned for, and
                      it had the same weight as the date beside it. Larger,
                      tabular figures so columns of digits line up, and on the
                      trailing edge where the eye runs down them.
                    */}
                    <td className="px-5 py-4 text-left">
                      <span className="text-[15px] font-black tabular-nums text-slate-950">
                        {transaction.amount.toLocaleString()}
                      </span>{' '}
                      <span className="text-xs font-bold text-slate-400">د.ع</span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                    </td>
                    <td className="px-5 py-4">
                      {transaction.canRefund ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-rose-200 font-bold text-rose-600 hover:bg-rose-50"
                          onClick={() => openRefund(transaction)}
                        >
                          استرجاع
                        </Button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-300">—</span>
                      )}
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
              options={PAYMENT_METHOD_FILTERS}
              onChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  method: asPaymentMethodFilter(value),
                }))
              }
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

      {refundTarget && (
        <SideDrawer
          title="استرجاع دفعة QiCard"
          subtitle={refundTarget.store?.name || getTransactionLabel(refundTarget)}
          icon={<CreditCard className="h-6 w-6" />}
          maxWidth="max-w-md"
          onClose={closeRefund}
          footer={(
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                disabled={refunding}
                onClick={closeRefund}
                className="h-14 rounded-2xl bg-slate-100 font-black text-slate-600 disabled:opacity-60"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={refunding}
                onClick={submitRefund}
                className="h-14 rounded-2xl bg-linear-to-l from-rose-600 to-orange-500 font-black text-white shadow-lg shadow-rose-200 disabled:opacity-60"
              >
                {refunding ? 'جارٍ الاسترجاع…' : 'تأكيد الاسترجاع'}
              </button>
            </div>
          )}
        >
          <div className="space-y-5">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              <p>
                المبلغ الأصلي:{' '}
                <span className="font-black text-slate-950">
                  {(refundTarget.amount ?? 0).toLocaleString()} د.ع
                </span>
              </p>
              <p className="mt-1">
                المسترجع سابقاً:{' '}
                <span className="font-black text-slate-950">
                  {(refundTarget.refundedAmount ?? 0).toLocaleString()} د.ع
                </span>
              </p>
              <p className="mt-1">
                المتبقي:{' '}
                <span className="font-black text-rose-600">
                  {remainingRefund(refundTarget).toLocaleString()} د.ع
                </span>
              </p>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-black text-slate-800">مبلغ الاسترجاع (د.ع)</span>
              <Input
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
                inputMode="decimal"
                className="h-12 rounded-2xl"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-black text-slate-800">سبب الاسترجاع (اختياري)</span>
              <Input
                value={refundMessage}
                onChange={(event) => setRefundMessage(event.target.value)}
                placeholder="مثل: استرجاع جزئي / كامل"
                className="h-12 rounded-2xl"
              />
            </label>
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

/**
 * The mark for a payment method, including when there is no mark to draw.
 *
 * The version this replaces ended in `return <visa>` — so every payment whose
 * brand could not be sniffed rendered a Visa logo, and the function feeding it
 * picked between Visa and Mastercard with `hash % 2` when sniffing failed. A
 * brand is a fact about a transaction; if the gateway did not tell us, the
 * honest mark is the gateway's own, or a plain card.
 */
const PaymentMethodIcon = ({ art }: { art: PaymentMethodArt }) => {
  if (art === 'visa') {
    return (
      <span className="flex h-6 w-10 items-center justify-center overflow-hidden rounded bg-white ring-1 ring-slate-100">
        <img src="/accounting/visa.svg" alt="Visa" className="h-3 w-7" />
      </span>
    );
  }

  if (art === 'mastercard') {
    return (
      <span className="flex h-6 w-10 items-center justify-center overflow-hidden rounded bg-white ring-1 ring-slate-100">
        <img src="/accounting/mastercard.svg" alt="MasterCard" className="h-4 w-7" />
      </span>
    );
  }

  if (art === 'bank') {
    return (
      <span className="grid h-6 w-10 place-items-center">
        <img src="/accounting/bank.svg" alt="" className="h-5 w-5" />
      </span>
    );
  }

  /**
   * ZainCash is an Iraqi wallet and used to be drawn with a **Google Pay**
   * logo. A wallet glyph in the brand's own colour says what it is and claims
   * nothing that is not true.
   */
  if (art === 'zaincash') {
    return (
      <span className="grid h-6 w-10 place-items-center rounded bg-violet-50 ring-1 ring-violet-100">
        <Wallet className="h-3.5 w-3.5 text-violet-600" strokeWidth={2.5} />
      </span>
    );
  }

  if (art === 'qicard') {
    return (
      <span className="grid h-6 w-10 place-items-center rounded bg-amber-50 ring-1 ring-amber-100">
        <CreditCard className="h-3.5 w-3.5 text-amber-600" strokeWidth={2.5} />
      </span>
    );
  }

  // A card whose network nobody reported.
  return (
    <span className="grid h-6 w-10 place-items-center rounded bg-slate-50 ring-1 ring-slate-200">
      <CreditCard className="h-3.5 w-3.5 text-slate-400" strokeWidth={2.5} />
    </span>
  );
};

/**
 * What the row is for, in words.
 *
 * It used to prefix a number taken from the last two digits of the row's uuid
 * — `String(id).replace(/\D/g,'').slice(-2) || '01'` — which is not an
 * identifier: two rows showing «أشتراك #01» is the normal case, and an
 * operator reading a support ticket cannot use it to find anything. The table
 * already numbers its rows for the eye, and the real id is in the drawer, so
 * the label says what was bought and nothing it cannot back up.
 */
const getTransactionLabel = (transaction: AccountingTransaction) => {
  const kind =
    transaction.type === 'SUBSCRIPTION'
      ? 'أشتراك'
      : transaction.type === 'CREDITS'
        ? 'رصيد AI'
        : transaction.type === 'RENEWAL'
          ? 'تجديد'
          : transaction.type === 'CHANGE_PLAN'
            ? 'تغيير باقة'
            : transaction.type === 'DOMAIN_REGISTRATION'
              ? 'نطاق'
              : transaction.type === 'INITIAL_SUBSCRIPTION'
                ? 'اشتراك'
                : 'دفعة';
  const planName = transaction.plan?.name ? ` — ${transaction.plan.name}` : '';
  return `${kind}${planName}`;
};

const getStatusMeta = (status: string) => {
  if (status === 'COMPLETED' || status === 'PAID' || status === 'ACTIVE') {
    return { label: 'مدفوع', tone: 'green' as const };
  }
  if (status === 'PARTIALLY_REFUNDED') {
    return { label: 'استرجاع جزئي', tone: 'amber' as const };
  }
  if (status === 'REFUNDED') {
    return { label: 'مسترجع', tone: 'slate' as const };
  }
  if (status === 'PENDING' || status === 'INACTIVE') {
    return { label: 'قيد المراجعة', tone: 'amber' as const };
  }
  if (status === 'CANCELLED' || status === 'FAILED' || status === 'EXPIRED') {
    return { label: 'غير مدفوع', tone: 'red' as const };
  }
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
