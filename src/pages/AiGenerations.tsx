import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle, Clock, LayoutTemplate, Sparkles, TriangleAlert, Wallet } from 'lucide-react';
import {
  AlertMessage,
  EmptyState,
  LoadingState,
  PageHeader,
  Pagination,
  SearchFiltersBar,
  SelectField,
  SideDrawer,
  StatCard,
  StatusPill,
  TableShell,
  type StatusTone,
} from '@/components/dashboard';
import {
  aiGenerationsService,
  type GenerationDetail,
  type GenerationRow,
  type GenerationStatus,
  type GenerationsSummary,
} from '../services/aiGenerationsService';

/**
 * Every AI store build: did it work, where did it stop, why, what it cost and
 * how long it took. Failures used to be readable only in the server logs.
 */

const STATUS: Record<GenerationStatus, { label: string; tone: StatusTone }> = {
  SUCCEEDED: { label: 'نجح', tone: 'green' },
  FAILED: { label: 'فشل', tone: 'red' },
  RUNNING: { label: 'قيد البناء', tone: 'amber' },
  PENDING: { label: 'تصميم لم يُبنَ', tone: 'slate' },
};

const FAILURES: Record<string, string> = {
  timeout: 'انقطاع الاتصال أو المهلة',
  'ai-busy': 'خدمة الذكاء مزدحمة',
  'ai-unavailable': 'مفتاح الذكاء مرفوض أو بلا رصيد',
  'qa-gate': 'لم يجتز فحص الجودة',
  'daily-limit': 'الحد اليومي',
  unknown: 'خطأ آخر',
  unrecorded: 'غير مسجّل (قبل هذه الصفحة)',
};

const STEPS: Record<string, string> = {
  foundation: 'التحليل والهوية',
  design: 'التصميم والصور',
  store: 'تجهيز المتجر',
  publish: 'المراجعة والنشر',
  proposal: 'اقتراح التصميم',
};

const RANGES = [
  { value: '1', label: 'آخر 24 ساعة' },
  { value: '7', label: 'آخر 7 أيام' },
  { value: '30', label: 'آخر 30 يوماً' },
  { value: '90', label: 'آخر 90 يوماً' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'الكل' },
  ...Object.entries(STATUS).map(([value, { label }]) => ({ value, label })),
];

const usd = (value: number | null | undefined) =>
  value == null ? '—' : `$${value < 1 ? value.toFixed(3) : value.toFixed(2)}`;

const duration = (seconds: number | null | undefined) => {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds} ث`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes} د ${rest} ث` : `${minutes} د`;
};

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('ar-IQ', {
    timeZone: 'Asia/Baghdad',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const errorMessage = (err: unknown, fallback: string) => {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message[0] ?? fallback;
  return message || fallback;
};

const fromDays = (days: string) => new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString();

/** What went wrong, or what was unusual about a run that worked. */
const outcomeNote = (row: GenerationRow) => {
  if (row.status === 'FAILED') {
    const reason = FAILURES[row.failureCode ?? 'unrecorded'] ?? row.failureCode;
    return row.step ? `${reason} · عند ${STEPS[row.step] ?? row.step}` : reason;
  }
  if (row.fallback) return 'قالب جاهز بدل التصميم';
  if (row.salvagedSections) return `حُذف ${row.salvagedSections} قسم لاجتياز الفحص`;
  return '—';
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-2">
    <h3 className="text-sm font-black text-slate-950">{title}</h3>
    {children}
  </section>
);

const Rows = ({ rows }: { rows: Array<[string, ReactNode]> }) => (
  <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-100 text-sm">
    {rows.map(([label, value]) => (
      <div key={label} className="flex items-start justify-between gap-4 px-4 py-2.5">
        <dt className="shrink-0 font-bold text-slate-500">{label}</dt>
        <dd className="min-w-0 text-left font-semibold text-slate-900 wrap-anywhere">{value}</dd>
      </div>
    ))}
  </dl>
);

const DetailDrawer = ({ id, onClose }: { id: string; onClose: () => void }) => {
  const [detail, setDetail] = useState<GenerationDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    aiGenerationsService
      .detail(id)
      .then((value) => live && setDetail(value))
      .catch((err) => live && setError(errorMessage(err, 'تعذر تحميل التوليد')));
    return () => {
      live = false;
    };
  }, [id]);

  const qaPages = detail?.qaSummary?.pages ?? [];
  const signals = Object.entries(detail?.qaSummary?.repairSignals ?? {});

  return (
    <SideDrawer
      title={detail?.storeName || 'توليد متجر'}
      subtitle={detail ? `${STATUS[detail.status].label} · ${dateTime(detail.createdAt)}` : undefined}
      icon={<Sparkles className="h-6 w-6" />}
      maxWidth="max-w-2xl"
      onClose={onClose}
    >
      {error && <AlertMessage>{error}</AlertMessage>}
      {!detail && !error && <LoadingState />}
      {detail && (
        <div className="space-y-6 text-right">
          <Section title="الطلب">
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-7 whitespace-pre-wrap text-slate-700">
              {detail.prompt}
            </p>
          </Section>

          <Rows
            rows={[
              [
                'التاجر',
                detail.user ? (
                  <>
                    {detail.user.name || 'بدون اسم'} · <span dir="ltr">{detail.user.phone || detail.user.email}</span>
                  </>
                ) : (
                  '—'
                ),
              ],
              ['المتجر', detail.store?.domain ? <span dir="ltr">{detail.store.domain}.mel.iq</span> : '—'],
              ['نوع النشاط', detail.businessType || '—'],
              ['صور مرجعية', detail.referenceImages.length || (detail.figmaUrl ? 'Figma' : '—')],
              ['المدة', duration(detail.durationSeconds)],
              ['الكلفة', usd(detail.costUsd)],
            ]}
          />

          {detail.failure && (
            <Section title="سبب الفشل">
              <Rows
                rows={[
                  ['النوع', FAILURES[detail.failure.code] ?? detail.failure.code],
                  ['الخطوة', detail.failure.step ? STEPS[detail.failure.step] ?? detail.failure.step : '—'],
                  ['ما رآه التاجر', detail.error || '—'],
                ]}
              />
              <pre dir="ltr" className="overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-left text-xs leading-6 text-slate-100">
                {[detail.failure.detail, ...detail.failure.where].join('\n')}
              </pre>
            </Section>
          )}
          {!detail.failure && detail.status === 'FAILED' && (
            <AlertMessage>{detail.error || 'فشل دون سبب مسجّل'} (فشل قبل تسجيل الأسباب)</AlertMessage>
          )}

          {detail.fallbackReason && (
            <Section title="استُخدم قالب جاهز">
              <p dir="ltr" className="rounded-2xl bg-orange-50 px-4 py-3 text-left text-xs font-semibold text-orange-700">
                {detail.fallbackReason}
              </p>
            </Section>
          )}

          {detail.steps.length > 0 && (
            <Section title="الوقت لكل خطوة">
              <Rows rows={detail.steps.map((s) => [STEPS[s.key] ?? s.label, duration(s.seconds)])} />
            </Section>
          )}

          {qaPages.length > 0 && (
            <Section title="فحص الجودة">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="py-2 text-right font-bold">الصفحة</th>
                    <th className="py-2 text-right font-bold">مشاكل مانعة</th>
                    <th className="py-2 text-right font-bold">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {qaPages.map((p) => (
                    <tr key={p.page}>
                      <td className="py-2 font-bold text-slate-900">{p.page}</td>
                      <td dir="ltr" className="py-2 text-right text-xs text-red-600">{p.hardFindings.join(', ') || '—'}</td>
                      <td dir="ltr" className="py-2 text-right text-xs text-slate-500">{p.softFindings.join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {signals.length > 0 && (
                <p dir="ltr" className="text-left text-xs text-slate-500">
                  {signals.map(([code, count]) => `${code} ×${count}`).join(' · ')}
                </p>
              )}
            </Section>
          )}

          {detail.spend.length > 0 && (
            <Section title="الكلفة">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="py-2 text-right font-bold">العملية</th>
                    <th className="py-2 text-right font-bold">الطلبات</th>
                    <th className="py-2 text-right font-bold">رموز الإدخال / الإخراج</th>
                    <th className="py-2 text-right font-bold">الكلفة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detail.spend.map((e, index) => (
                    <tr key={index}>
                      <td dir="ltr" className="py-2 text-right text-xs font-bold text-slate-700">{e.kind}</td>
                      <td className="py-2">{e.calls}</td>
                      <td dir="ltr" className="py-2 text-right text-xs">
                        {e.promptTokens.toLocaleString()} / {e.completionTokens.toLocaleString()}
                      </td>
                      <td className="py-2 font-bold">{usd(e.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          <p dir="ltr" className="text-left text-[11px] text-slate-400">{detail.id}</p>
        </div>
      )}
    </SideDrawer>
  );
};

const AiGenerations = () => {
  const [summary, setSummary] = useState<GenerationsSummary | null>(null);
  const [rows, setRows] = useState<GenerationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [range, setRange] = useState('7');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [queryTerm, setQueryTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setQueryTerm(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setError('');
    try {
      const from = fromDays(range);
      const [nextSummary, list] = await Promise.all([
        aiGenerationsService.summary({ from }),
        aiGenerationsService.list({
          page,
          limit: pageSize,
          from,
          status: status === 'all' ? undefined : (status as GenerationStatus),
          search: queryTerm.trim() || undefined,
        }),
      ]);
      setSummary(nextSummary);
      setRows(list.rows);
      setTotal(list.total);
    } catch (err) {
      setError(errorMessage(err, 'تعذر تحميل التوليدات'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, range, status, queryTerm]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !summary) return <LoadingState />;

  const counts = summary?.counts;
  const totalPages = Math.max(1, Math.ceil((total || 1) / pageSize));

  return (
    <div className="page-shell space-y-6 bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="توليدات الذكاء"
        description="كل متجر بُني بالذكاء الاصطناعي: هل نجح، وأين توقف ولماذا، وكم كلّف واستغرق."
        icon={<Sparkles className="h-5 w-5" />}
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      {summary && counts && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            title="نسبة النجاح"
            value={summary.successPercent == null ? '—' : `${summary.successPercent}%`}
            icon={<CheckCircle />}
            tone="emerald"
            sub={`${counts.SUCCEEDED} نجح · ${counts.FAILED} فشل`}
          />
          <StatCard
            title="قالب جاهز بدل التصميم"
            value={summary.fallback}
            icon={<LayoutTemplate />}
            tone="amber"
            sub={summary.salvaged ? `${summary.salvaged} نجا بحذف أقسام` : undefined}
          />
          <StatCard
            title="مدة البناء"
            value={duration(summary.durationSeconds.median)}
            icon={<Clock />}
            tone="slate"
            sub={summary.durationSeconds.p90 != null ? `أبطأ 10%: ${duration(summary.durationSeconds.p90)}` : 'الوسيط'}
          />
          <StatCard
            title="كلفة البناء الواحد"
            value={usd(summary.cost.perBuildUsd)}
            icon={<Wallet />}
            tone="slate"
            sub={`المجموع ${usd(summary.cost.totalUsd)}`}
          />
        </div>
      )}

      {summary && summary.failures.length > 0 && (
        <TableShell>
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
                <th className="px-5 py-3 text-right">سبب الفشل</th>
                <th className="px-5 py-3 text-right">الخطوة</th>
                <th className="px-5 py-3 text-right">العدد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.failures.map((f) => (
                <tr key={`${f.code}-${f.step}`} className="text-sm text-slate-700">
                  <td className="px-5 py-3 font-bold text-slate-950">
                    <span className="inline-flex items-center gap-2">
                      <TriangleAlert className="h-4 w-4 text-red-500" />
                      {FAILURES[f.code] ?? f.code}
                    </span>
                  </td>
                  <td className="px-5 py-3">{f.step ? STEPS[f.step] ?? f.step : '—'}</td>
                  <td className="px-5 py-3 font-black">{f.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}

      <SearchFiltersBar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        placeholder="ابحث بالمتجر أو الهاتف أو الطلب"
        onFilterClick={() => {
          setSearch('');
          setQueryTerm('');
          setStatus('all');
          setRange('7');
          setPage(1);
        }}
      >
        <div className="min-w-[160px]">
          <SelectField
            label="الفترة"
            value={range}
            options={RANGES}
            onChange={(value) => {
              setRange(value);
              setPage(1);
            }}
          />
        </div>
        <div className="min-w-[160px]">
          <SelectField
            label="الحالة"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
        </div>
      </SearchFiltersBar>

      <TableShell
        footer={
          <Pagination
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={[20, 50, 100]}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        }
      >
        {rows.length === 0 ? (
          <EmptyState title="لا توجد توليدات في هذه الفترة" />
        ) : (
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
                <th className="px-5 py-4 text-right">الوقت</th>
                <th className="px-5 py-4 text-right">المتجر</th>
                <th className="px-5 py-4 text-right">التاجر</th>
                <th className="px-5 py-4 text-right">الحالة</th>
                <th className="px-5 py-4 text-right">التفاصيل</th>
                <th className="px-5 py-4 text-right">المدة</th>
                <th className="px-5 py-4 text-right">الكلفة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setOpenId(row.id)}
                  className="cursor-pointer text-sm text-slate-700 transition hover:bg-slate-50/70"
                >
                  <td className="px-5 py-3 whitespace-nowrap text-slate-500">{dateTime(row.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="font-black text-slate-950">{row.storeName || '—'}</div>
                    <div className="max-w-[260px] truncate text-xs text-slate-400" title={row.prompt}>{row.prompt}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-bold">{row.user?.name || '—'}</div>
                    {row.user?.phone && <div dir="ltr" className="text-right text-xs text-slate-400">{row.user.phone}</div>}
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill tone={STATUS[row.status].tone} dot>{STATUS[row.status].label}</StatusPill>
                  </td>
                  <td className="min-w-[220px] px-5 py-3 text-slate-600">{outcomeNote(row)}</td>
                  <td className="px-5 py-3 whitespace-nowrap">{duration(row.durationSeconds)}</td>
                  <td className="px-5 py-3 font-bold whitespace-nowrap">{usd(row.costUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableShell>

      {openId && <DetailDrawer id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
};

export default AiGenerations;
