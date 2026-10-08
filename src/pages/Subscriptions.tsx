import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  CheckCircle,
  Eye,
  PauseCircle,
  ReceiptText,
  TriangleAlert,
} from 'lucide-react';
import {
  AlertMessage,
  EmptyState,
  LoadingState,
  MenuItem,
  PageHeader,
  Pagination,
  RowMenu,
  SearchFiltersBar,
  SelectField,
  StatCard,
  StatusPill,
  TableShell,
} from '@/components/dashboard';
import { SubscriptionActions } from '@/components/dashboard/SubscriptionActions';
import {
  systemSubscriptionsService,
  type Subscription,
} from '../services/systemSubscriptionsService';
import { apiErrorMessage } from '../services/domainHealthService';
import {
  subscriptionStatusLabel,
  subscriptionStatusTone,
} from '@/utils/subscriptionStatus';

/**
 * The operator's subscription list.
 *
 * There was no such screen. `GET /subscription/system/all`, `/system/search` and
 * the five `PUT /subscription/system/:id/*` routes all existed, worked and were
 * tested; the only surface that touched any of them was a table at the bottom of
 * the plans page which loaded every row on the platform unpaginated, printed the
 * status as a raw English enum, and whose «عرض» button had no `onClick`.
 *
 * Paginated **server-side**, following `Stores.tsx`: the rows are per-store and
 * unbounded, so slicing in memory would mean fetching the platform to show ten
 * of it. The consequence is that the search box and the status filter narrow the
 * page that is loaded, not the whole table — the same trade `Stores` makes, and
 * the reason the search box is wired to the server's own `/system/search`
 * instead.
 */
const STATUS_OPTIONS = [
  { value: 'all', label: 'كل الحالات' },
  { value: 'ACTIVE', label: 'نشط' },
  { value: 'INACTIVE', label: 'موقوف مؤقتاً' },
  { value: 'EXPIRED', label: 'منتهي' },
  { value: 'CANCELLED', label: 'ملغى' },
];

const Subscriptions = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  /**
   * The term the server has actually been asked about.
   *
   * `search` updates on every keystroke, and the effect below used to depend on
   * it directly — so typing a six-character store name fired six paginated
   * searches, five of them already stale, with no ordering guarantee between
   * the responses.
   */
  const [queryTerm, setQueryTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  /** Which row has its action panel open. One at a time. */
  const [actingOn, setActingOn] = useState<string | null>(null);

  const fetchRows = useCallback(
    async (nextPage: number, limit: number, term: string) => {
      try {
        setLoading(true);
        setError('');
        const response = term.trim()
          ? await systemSubscriptionsService.searchSubscriptions({
              query: term.trim(),
              page: nextPage,
              limit,
            })
          : await systemSubscriptionsService.getAllSubscriptions({
              page: nextPage,
              limit,
            });
        setRows(response.data || []);
        setTotal(response.total ?? response.data?.length ?? 0);
      } catch (err) {
        setError(apiErrorMessage(err, 'فشل في جلب الاشتراكات.'));
        console.error('Error loading subscriptions:', err);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Settles 350ms after the operator stops typing. The timer is cleared on
  // every change, so only the last term is ever requested.
  useEffect(() => {
    const timer = window.setTimeout(() => setQueryTerm(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void fetchRows(page, pageSize, queryTerm);
  }, [fetchRows, page, pageSize, queryTerm]);

  const visibleRows = useMemo(
    () =>
      statusFilter === 'all'
        ? rows
        : rows.filter((row) => row.status === statusFilter),
    [rows, statusFilter],
  );

  /**
   * Counted over the page, and labelled as such. The server returns no status
   * breakdown, so claiming these were platform totals would be a number that
   * silently changes with the page size.
   */
  const stats = useMemo(() => {
    const live = rows.filter((row) => row.status === 'ACTIVE').length;
    const paused = rows.filter((row) => row.status === 'INACTIVE').length;
    const over = rows.filter(
      (row) =>
        row.status === 'EXPIRED' ||
        (row.status === 'ACTIVE' && new Date(row.end_at).getTime() <= Date.now()),
    ).length;
    return { live, paused, over };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil((total || 1) / pageSize));

  if (loading && rows.length === 0) return <LoadingState />;

  return (
    <div className="page-shell bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="الاشتراكات"
        description={
          <>
            هناك{' '}
            <span className="font-black text-violet-600">{total} اشتراك</span>{' '}
            على المنصة
          </>
        }
        icon={<ReceiptText className="h-6 w-6" />}
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="إجمالي الاشتراكات"
          value={total}
          icon={<ReceiptText />}
          tone="violet"
        />
        {/* The qualifier goes in `sub`, not the title: `StatCard` truncates its
            title on one line, so "(في هذه الصفحة)" was being cut off — which
            turned a page-scoped count into one that reads as a platform total. */}
        <StatCard
          title="نشطة"
          value={stats.live}
          icon={<CheckCircle />}
          tone="teal"
          sub="في هذه الصفحة"
        />
        <StatCard
          title="موقوفة مؤقتاً"
          value={stats.paused}
          icon={<PauseCircle />}
          tone="amber"
          sub="في هذه الصفحة"
        />
        {/* Includes terms that have run out but still say ACTIVE, which is the
            normal state while SUBSCRIPTION_AUTO_EXPIRE is off. */}
        <StatCard
          title="منتهية المدة"
          value={stats.over}
          icon={<TriangleAlert />}
          tone="rose"
          sub="في هذه الصفحة"
        />
      </div>

      <SearchFiltersBar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        placeholder="ابحث باسم المتجر"
        onFilterClick={() => {
          setSearch('');
          // Cleared immediately as well, so "reset filters" does not wait out
          // the debounce before the full list comes back.
          setQueryTerm('');
          setStatusFilter('all');
          setPage(1);
        }}
      >
        <div className="min-w-[200px]">
          <SelectField
            label="الحالة"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={setStatusFilter}
          />
        </div>
      </SearchFiltersBar>

      <TableShell
        footer={
          <Pagination
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        }
      >
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
              <th className="px-5 py-5 text-right">المتجر</th>
              <th className="px-5 py-5 text-right">الخطة</th>
              <th className="px-5 py-5 text-right">الحالة</th>
              <th className="px-5 py-5 text-right">تنتهي في</th>
              <th className="px-5 py-5 text-right">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.map((row) => {
              const termIsPast = new Date(row.end_at).getTime() <= Date.now();
              return (
                <tr
                  key={row.id}
                  className="align-top text-sm text-slate-700 transition hover:bg-slate-50/70"
                >
                  <td className="px-5 py-4 font-black text-slate-950">
                    {row.store?.name || '—'}
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-600">
                    {row.plan?.name || '—'}
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill tone={subscriptionStatusTone(row.status)} dot>
                      {subscriptionStatusLabel(row.status)}
                    </StatusPill>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-600">
                    <div className="flex flex-col gap-1">
                      <span>{formatDate(row.end_at)}</span>
                      {/* The state the risk panel could not see: the term has
                          passed and nothing has retired the row. */}
                      {termIsPast && row.status === 'ACTIVE' && (
                        <span className="text-xs font-black text-orange-500">
                          انتهت المدة ولم تُرحّل بعد
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col items-end gap-3">
                      <RowMenu>
                        {(close) => (
                          <>
                            <MenuItem
                              icon={<CalendarClock className="h-4 w-4" />}
                              label={
                                actingOn === row.id
                                  ? 'إخفاء الإجراءات'
                                  : 'إدارة الاشتراك'
                              }
                              onClick={() => {
                                setActingOn(
                                  actingOn === row.id ? null : row.id,
                                );
                                close();
                              }}
                            />
                            <MenuItem
                              icon={<Eye className="h-4 w-4" />}
                              label="عرض المتجر"
                              onClick={() => {
                                navigate(`/dashboard/stores/${row.storeId}`);
                                close();
                              }}
                            />
                          </>
                        )}
                      </RowMenu>

                      {actingOn === row.id && (
                        <div className="w-full max-w-md text-right">
                          <SubscriptionActions
                            subscription={row}
                            onDone={() => fetchRows(page, pageSize, queryTerm)}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10">
                  <EmptyState
                    title={
                      rows.length === 0
                        ? 'لا توجد اشتراكات'
                        : 'لا توجد اشتراكات بهذه الحالة في هذه الصفحة'
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return '—';
  return at.toLocaleDateString('ar-IQ-u-nu-latn', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default Subscriptions;
