import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import {
  AlertMessage,
  EmptyState,
  LoadingState,
  PageHeader,
  Pagination,
  PrimaryActionButton,
  SearchFiltersBar,
  StatCard,
  StatusPill,
  TableShell,
} from '@/components/dashboard';
import {
  apiErrorMessage,
  domainHealthService,
  type DashboardTlsAudit,
  type DashboardTlsRow,
} from '../services/domainHealthService';

/**
 * صحة نطاقات لوحات التحكم — dashboard hostname health.
 *
 * `dash.<slug>.mel.iq` is two labels deep, so the zone's `*.mel.iq` wildcard
 * certificate does not cover it. Total TLS issues one per hostname, and only
 * once an explicit proxied DNS record exists — so a store can lose its
 * dashboard entirely without anything in the platform noticing: not a
 * redirect, not a 404, a TLS handshake that fails before any HTTP happens.
 *
 * This page exists because the only way to know is to look. Every row here is
 * a live probe, not a database read: the record existing is not the hostname
 * working, and issuance can simply fail.
 */

/** A certificate does not appear the instant the record does. */
const ISSUANCE_HINT =
  'تصدر Cloudflare الشهادة بعد إنشاء السجل بدقائق. أعد الفحص بعد قليل.';

type RowState = 'idle' | 'repairing' | 'awaiting';

const DomainHealth = () => {
  const [audit, setAudit] = useState<DashboardTlsAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [onlyBroken, setOnlyBroken] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [repairingAll, setRepairingAll] = useState(false);

  /**
   * Typing is not a reason to re-probe.
   *
   * Search is a server query now, so an unthrottled input would fire one
   * request per keystroke at a route that probes hostnames.
   */
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const id = setTimeout(() => {
      // Page and term move together: narrowing the results can leave you past
      // the last page, and resetting it in a *separate* effect fetched twice —
      // once for the new term on the old page, then again once the page caught
      // up. React batches these two, so it is one render and one request.
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  /** Same reason as above: change the filter and the page in one go. */
  const toggleOnlyBroken = useCallback(() => {
    setOnlyBroken((value) => !value);
    setPage(1);
  }, []);

  const changePageSize = useCallback((size: number) => {
    setLimit(size);
    setPage(1);
  }, []);

  const load = useCallback(
    async (opts: { refresh?: boolean } = {}) => {
      setLoading(true);
      setError('');
      try {
        setAudit(
          await domainHealthService.audit({
            page,
            limit,
            status: onlyBroken ? 'broken' : 'all',
            search: debouncedSearch,
            refresh: opts.refresh,
          }),
        );
      } catch (err) {
        setError(
          apiErrorMessage(err, 'تعذر فحص النطاقات. تأكد من صلاحية الجلسة.'),
        );
      } finally {
        setLoading(false);
      }
    },
    [page, limit, onlyBroken, debouncedSearch],
  );

  useEffect(() => {
    void load();
  }, [load]);

  /** Re-probe one host and fold the answer back into the table. */
  const recheck = useCallback(async (domain: string) => {
    const probe = await domainHealthService.check(domain);
    setAudit((current) => {
      if (!current) return current;
      const apply = (row: DashboardTlsRow): DashboardTlsRow =>
        row.domain === domain
          ? { ...row, dnsOk: probe.dnsOk, tlsOk: probe.tlsOk, ready: probe.ready }
          : row;
      const stores = current.stores.map(apply);
      const broken = stores.filter((row) => !row.ready);
      return {
        ...current,
        stores,
        broken,
        brokenCount: broken.length,
        readyCount: stores.length - broken.length,
      };
    });
    return probe.ready;
  }, []);

  const repairOne = useCallback(
    async (row: DashboardTlsRow) => {
      setRowState((state) => ({ ...state, [row.domain]: 'repairing' }));
      setNotice('');
      setError('');
      try {
        await domainHealthService.provision(row.domain);
        // Never trust the response body: on a server that predates the
        // reporting fix this answers "provisioned" whether or not Cloudflare
        // accepted anything. The probe is the verdict.
        const ready = await recheck(row.domain);
        setRowState((state) => ({
          ...state,
          [row.domain]: ready ? 'idle' : 'awaiting',
        }));
        setNotice(
          ready
            ? `تم إصلاح ${row.host} وهو يعمل الآن.`
            : `تم إنشاء السجل لـ ${row.host}. ${ISSUANCE_HINT}`,
        );
      } catch (err) {
        setRowState((state) => ({ ...state, [row.domain]: 'idle' }));
        setError(
          apiErrorMessage(
            err,
            `تعذر إصلاح ${row.host}. تحقق من مفتاح Cloudflare في الخادم.`,
          ),
        );
      }
    },
    [recheck],
  );

  const repairAll = useCallback(async () => {
    if (!audit?.broken.length) return;
    setRepairingAll(true);
    setNotice('');
    setError('');
    try {
      const result = await domainHealthService.provisionAllBroken();
      const failed = result.failedCount ?? 0;
      // Same rule as one row: re-probe rather than believe the summary.
      const targets = audit.broken.map((row) => row.domain);
      const readiness = await Promise.all(
        targets.map(async (domain) => {
          try {
            return await recheck(domain);
          } catch {
            return false;
          }
        }),
      );
      const stillWaiting = readiness.filter((ready) => !ready).length;
      setRowState((state) => {
        const next = { ...state };
        targets.forEach((domain, index) => {
          next[domain] = readiness[index] ? 'idle' : 'awaiting';
        });
        return next;
      });
      setNotice(
        failed > 0
          ? `رفضت Cloudflare ${failed} من ${result.count ?? targets.length}. تحقق من المفتاح.`
          : stillWaiting > 0
            ? `تم إنشاء السجلات. ${stillWaiting} بانتظار الشهادة — ${ISSUANCE_HINT}`
            : 'تم إصلاح جميع النطاقات.',
      );
    } catch (err) {
      setError(apiErrorMessage(err, 'تعذر تشغيل الإصلاح الجماعي.'));
    } finally {
      setRepairingAll(false);
    }
  }, [audit, recheck]);

  // Already filtered, searched, ordered (broken first) and paged by the
  // server — re-doing any of it here would only disagree with the counts.
  const rows = audit?.stores ?? [];

  const credentialsBad = audit?.credentials?.ok === false;

  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        title="صحة النطاقات"
        description="شهادات SSL للوحات تحكم المتاجر — فحص مباشر وإصلاح"
        icon={<ShieldCheck className="h-5 w-5" />}
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load({ refresh: true })}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition disabled:opacity-50 sm:h-12 sm:px-5"
            >
              <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              إعادة الفحص
            </button>
            {(audit?.brokenCount ?? 0) > 0 && (
              <PrimaryActionButton onClick={() => void repairAll()}>
                <Wrench className={repairingAll ? 'h-4 w-4 animate-pulse' : 'h-4 w-4'} />
                {repairingAll ? 'جارٍ الإصلاح…' : `إصلاح الكل (${audit?.brokenCount})`}
              </PrimaryActionButton>
            )}
          </div>
        }
      />

      {/* One bad token explains every red row at once, so it is said before
          the table rather than discovered twenty repairs later. */}
      {credentialsBad && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>رفضت Cloudflare مفتاح الخادم: {audit?.credentials?.reason}</p>
              <p className="mt-1 font-medium text-red-500">
                لن ينجح أي إصلاح قبل تحديث CLOUDFLARE_API_TOKEN بصلاحية
                Zone: DNS: Edit على mel.iq.
              </p>
            </div>
          </div>
        </div>
      )}

      {audit?.degraded && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-orange-600">
          تم الفحص متجراً متجراً لأن الخادم الحالي لا يملك مسار الفحص الشامل.
          النتائج نفسها، لكن حالة مفتاح Cloudflare غير معروفة هنا.
        </div>
      )}

      {error && <AlertMessage>{error}</AlertMessage>}
      {notice && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-600">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          title="نطاقات مفحوصة"
          value={audit?.checked ?? 0}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="blue"
          hint="فحص مباشر"
        />
        <StatCard
          title="تعمل"
          value={audit?.readyCount ?? 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
          hint="شهادة صالحة"
        />
        <StatCard
          title="معطلة"
          value={audit?.brokenCount ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="rose"
          hint={audit?.brokenCount ? 'تحتاج إصلاح' : 'لا يوجد'}
        />
      </div>

      <SearchFiltersBar
        search={search}
        onSearchChange={setSearch}
        placeholder="ابحث باسم المتجر أو النطاق"
        filterCount={onlyBroken ? 1 : 0}
        onFilterClick={toggleOnlyBroken}
      >
        {onlyBroken && (
          <span className="inline-flex h-11 items-center rounded-2xl bg-red-50 px-4 text-sm font-bold text-red-500 sm:h-12">
            المعطلة فقط
          </span>
        )}
      </SearchFiltersBar>

      {/* The sweep is cached for a minute, so say when it was taken rather
          than letting a stale table look live. */}
      {audit?.cachedAt && (
        <p className="px-1 text-xs font-medium text-slate-400">
          آخر فحص: {new Date(audit.cachedAt).toLocaleTimeString('en-GB')}
          {audit.total !== audit.checked && ` — ${audit.total} من ${audit.checked}`}
        </p>
      )}

      {loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <TableShell>
          <EmptyState
            title={
              onlyBroken
                ? 'كل النطاقات تعمل.'
                : 'لا توجد متاجر بنطاق لفحصه.'
            }
          />
        </TableShell>
      ) : (
        <TableShell
          footer={
            <Pagination
              page={audit?.page ?? 1}
              totalPages={audit?.totalPages ?? 1}
              pageSize={limit}
              pageSizeOptions={[10, 20, 50]}
              onPageChange={setPage}
              onPageSizeChange={changePageSize}
            />
          }
        >
          <table className="w-full min-w-[920px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
                <th className="px-5 py-5 text-right">المتجر</th>
                <th className="px-5 py-5 text-right">العنوان</th>
                <th className="px-5 py-5 text-right">سجل DNS</th>
                <th className="px-5 py-5 text-right">الشهادة</th>
                <th className="px-5 py-5 text-right">الحالة</th>
                <th className="px-5 py-5 text-right">آخر تغيير للنطاق</th>
                <th className="px-5 py-5 text-right">العمليات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const state = rowState[row.domain] ?? 'idle';
                const busy = state === 'repairing';
                return (
                  <tr
                    key={row.storeId}
                    className="text-sm text-slate-700 transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4 font-black text-slate-950">
                      {row.name || row.domain}
                    </td>
                    <td className="px-5 py-4" dir="ltr">
                      <a
                        href={`https://${row.host}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-slate-600 underline-offset-4 hover:text-violet-600 hover:underline"
                      >
                        {row.host}
                      </a>
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill tone={row.dnsOk ? 'green' : 'red'}>
                        {row.dnsOk ? 'موجود' : 'مفقود'}
                      </StatusPill>
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill tone={row.tlsOk ? 'green' : 'red'}>
                        {row.tlsOk ? 'صالحة' : 'لا توجد'}
                      </StatusPill>
                    </td>
                    <td className="px-5 py-4">
                      {row.ready ? (
                        <StatusPill tone="green">تعمل</StatusPill>
                      ) : state === 'awaiting' ? (
                        <StatusPill tone="amber">بانتظار الشهادة</StatusPill>
                      ) : (
                        <StatusPill tone="red">معطلة</StatusPill>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600" dir="ltr">
                      {row.renamedAt
                        ? new Date(row.renamedAt).toLocaleDateString('en-GB')
                        : '—'}
                    </td>
                    <td className="px-5 py-4">
                      {row.ready ? (
                        <button
                          type="button"
                          onClick={() => void recheck(row.domain)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-100 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          فحص
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void repairOne(row)}
                          disabled={busy}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
                        >
                          <Wrench className={busy ? 'h-3.5 w-3.5 animate-pulse' : 'h-3.5 w-3.5'} />
                          {busy ? 'جارٍ…' : 'إصلاح'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableShell>
      )}

      <p className="px-1 text-xs font-medium text-slate-400">
        نطاق لوحة التحكم عمقه مستويان، فلا تغطيه شهادة النطاق العام
        <span dir="ltr"> *.mel.iq</span>. تُصدر Cloudflare شهادة خاصة به، وفقط
        إذا كان له سجل DNS صريح — لذلك يظهر العطل كفشل في مصافحة TLS لا كصفحة
        خطأ. {ISSUANCE_HINT}
      </p>
    </div>
  );
};

export default DomainHealth;
