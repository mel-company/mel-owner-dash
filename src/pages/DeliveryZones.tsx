import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, MapPin, RefreshCw, Search } from 'lucide-react';
import { AlertMessage, LoadingState, PageHeader } from '@/components/dashboard';
import {
  deliveryCompanyService,
  type DeliveryZone,
  type DeliveryZones as Zones,
  type ZoneSyncReport,
} from '../services/deliveryCompanyService';

/**
 * What each courier calls the places the platform already knows about.
 *
 * The provinces and cities a shopper picks at checkout belong to the platform.
 * A courier knows the same places by its own names — Prime calls Baghdad "BGD"
 * and every city a number — so each company gets a translation table here
 * rather than its code space leaking into checkout. Swapping courier then means
 * filling in a new table and nothing else.
 *
 * A place with no code cannot be quoted for, and checkout falls back to the
 * company's base fee. That is the cost of leaving a row blank, and it is a lot
 * cheaper than a wrong code, which sends a parcel to the wrong city.
 */

/** Names arrive as `{ ar, en }` JSON, or a bare string on older rows. */
const displayName = (name: unknown): string => {
  if (!name) return '—';
  if (typeof name === 'string') return name;
  const n = name as Record<string, string | undefined>;
  return n.ar || n.en || n.arabic || n.english || '—';
};

const CodeInput = ({
  zone,
  placeholder,
  onSave,
}: {
  zone: DeliveryZone;
  placeholder: string;
  onSave: (code: string | null) => Promise<void>;
}) => {
  const [value, setValue] = useState(zone.externalCode ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(zone.externalCode ?? '');
  }, [zone.externalCode]);

  const dirty = (zone.externalCode ?? '') !== value.trim();

  const commit = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await onSave(value.trim() === '' ? null : value.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void commit();
        }}
        dir="ltr"
        className={`w-32 rounded-lg border px-2.5 py-1.5 text-sm outline-none transition-colors ${
          dirty ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white'
        }`}
      />
      <span className="w-12 text-xs text-slate-400">
        {saving ? '…' : saved ? 'تم' : ''}
      </span>
    </div>
  );
};

const DeliveryZonesPage = () => {
  const { deliveryCompanyId = '' } = useParams<{ deliveryCompanyId: string }>();
  const [zones, setZones] = useState<Zones | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [onlyUnmapped, setOnlyUnmapped] = useState(false);

  const load = useCallback(async () => {
    if (!deliveryCompanyId) return;
    setLoading(true);
    setError('');
    try {
      setZones(await deliveryCompanyService.getZones(deliveryCompanyId));
    } catch {
      setError('تعذر تحميل المناطق');
    } finally {
      setLoading(false);
    }
  }, [deliveryCompanyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    setMessage('');
    try {
      const report: ZoneSyncReport = await deliveryCompanyService.syncZones(deliveryCompanyId);
      setMessage(
        `تمت مطابقة ${report.states.matched} من ${report.states.total} محافظة، و ${report.regions.matched} من ${report.regions.total} مدينة. ` +
          (report.regions.unmatched.length
            ? `لم تتم مطابقة: ${report.regions.unmatched.slice(0, 8).join('، ')}${report.regions.unmatched.length > 8 ? '…' : ''}`
            : 'تمت مطابقة كل المدن.'),
      );
      await load();
    } catch {
      setError('تعذر جلب المناطق من شركة الشحن — يمكن إدخال الأكواد يدوياً');
    } finally {
      setSyncing(false);
    }
  };

  const stateNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const state of zones?.states ?? []) map.set(state.id, displayName(state.name));
    return map;
  }, [zones]);

  const matches = (zone: DeliveryZone, extra = '') => {
    if (onlyUnmapped && zone.externalCode) return false;
    if (!search.trim()) return true;
    return `${displayName(zone.name)} ${zone.externalCode ?? ''} ${extra}`
      .toLowerCase()
      .includes(search.trim().toLowerCase());
  };

  const visibleStates = (zones?.states ?? []).filter((s) => matches(s));
  const visibleRegions = (zones?.regions ?? []).filter((r) =>
    matches(r, stateNameById.get(r.stateId ?? '') ?? ''),
  );

  const mappedStates = (zones?.states ?? []).filter((s) => s.externalCode).length;
  const mappedRegions = (zones?.regions ?? []).filter((r) => r.externalCode).length;

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title={`مناطق الشحن — ${zones?.deliveryCompany.name ?? ''}`}
        description="ربط محافظات ومدن المنصة بأكواد شركة الشحن. المدينة غير المربوطة تستخدم السعر الافتراضي."
        icon={<MapPin className="h-5 w-5" />}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/dashboard/delivery"
          className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-sm font-black text-slate-600"
        >
          <ArrowRight className="h-4 w-4" />
          شركات الشحن
        </Link>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-sm font-black text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'جاري الجلب…' : 'جلب الأكواد من الشركة'}
        </button>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث عن محافظة أو مدينة"
            className="w-full rounded-xl border border-slate-200 py-2 pr-9 pl-3 text-sm outline-none"
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
          <input
            type="checkbox"
            checked={onlyUnmapped}
            onChange={(event) => setOnlyUnmapped(event.target.checked)}
          />
          غير المربوطة فقط
        </label>
      </div>

      {error && <AlertMessage>{error}</AlertMessage>}
      {message && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <section className="rounded-2xl border border-slate-100 bg-white p-4">
          <h3 className="mb-3 text-sm font-black text-slate-950">
            المحافظات ({mappedStates}/{zones?.states.length ?? 0} مربوطة)
          </h3>
          <div className="space-y-2">
            {visibleStates.map((state) => (
              <div key={state.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-700">{displayName(state.name)}</span>
                <CodeInput
                  zone={state}
                  placeholder="BGD"
                  onSave={async (code) => {
                    await deliveryCompanyService.setStateCode(deliveryCompanyId, state.id, code);
                    setZones((current) =>
                      current
                        ? {
                            ...current,
                            states: current.states.map((s) =>
                              s.id === state.id ? { ...s, externalCode: code } : s,
                            ),
                          }
                        : current,
                    );
                  }}
                />
              </div>
            ))}
            {!visibleStates.length && (
              <p className="py-6 text-center text-sm text-slate-400">لا توجد نتائج</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4">
          <h3 className="mb-3 text-sm font-black text-slate-950">
            المدن ({mappedRegions}/{zones?.regions.length ?? 0} مربوطة)
          </h3>
          <div className="max-h-[70vh] space-y-2 overflow-y-auto">
            {visibleRegions.map((region) => (
              <div key={region.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-700">
                  {displayName(region.name)}
                  <span className="mr-1.5 text-xs text-slate-400">
                    {stateNameById.get(region.stateId ?? '') ?? ''}
                  </span>
                </span>
                <CodeInput
                  zone={region}
                  placeholder="469"
                  onSave={async (code) => {
                    await deliveryCompanyService.setRegionCode(deliveryCompanyId, region.id, code);
                    setZones((current) =>
                      current
                        ? {
                            ...current,
                            regions: current.regions.map((r) =>
                              r.id === region.id ? { ...r, externalCode: code } : r,
                            ),
                          }
                        : current,
                    );
                  }}
                />
              </div>
            ))}
            {!visibleRegions.length && (
              <p className="py-6 text-center text-sm text-slate-400">لا توجد نتائج</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DeliveryZonesPage;
