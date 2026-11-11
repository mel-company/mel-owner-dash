import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronDown, GripVertical, Loader2, MessageCircle } from 'lucide-react';
import { AlertMessage, PageHeader, StatusSwitch } from '@/components/dashboard';
import { cn } from '@/lib/utils';
import { shopperService, type ShopperOtpProvider, type ShopperOtpProviderId } from '../services/shopperService';

/**
 * حسابات المتسوقين: who sends the shopper's WhatsApp sign-in code.
 *
 * The providers form one ordered list. The code goes to the first one that is
 * on; if it refuses, the next one is tried. Rows are reordered by dragging the
 * handle (pointer events, so it works with a mouse and on a phone). OTPIQ is
 * the server's last resort even with every switch off.
 */
type Row = ShopperOtpProvider & { apiKey: string };

const INFO: Record<ShopperOtpProviderId, { name: string; detail: string; logo: string; tile: string; fields: boolean }> = {
  warid: { name: 'وارد', detail: 'رسالة واتساب', logo: '/providers/warid.png', tile: 'bg-white p-2 ring-1 ring-slate-200', fields: true },
  otpiq: { name: 'OTPIQ', detail: 'واتساب، ثم رسالة نصية', logo: '/providers/otpiq.svg', tile: 'bg-white p-2 ring-1 ring-slate-200', fields: false },
};

const INPUT =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400';

const configured = (row: Row) => Boolean(row.channelId.trim() && (row.apiKey.trim() || row.hasApiKey));
const toRows = (providers: ShopperOtpProvider[]): Row[] => providers.map((p) => ({ ...p, apiKey: '' }));
const snapshot = (rows: Row[]) => JSON.stringify(rows.map(({ id, enabled, channelId, apiKey }) => [id, enabled, channelId, apiKey]));

const ShopperAccounts = () => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saved, setSaved] = useState('');
  const [open, setOpen] = useState<ShopperOtpProviderId | null>(null);
  const [dragging, setDragging] = useState<ShopperOtpProviderId | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const list = useRef<HTMLDivElement>(null);

  const load = (providers: ShopperOtpProvider[]) => {
    const next = toRows(providers);
    setRows(next);
    setSaved(snapshot(next));
  };

  useEffect(() => {
    shopperService
      .getOtpSettings()
      .then((res) => load(res.providers))
      .catch((err) => {
        setError('تعذر تحميل الإعدادات.');
        console.error('Error loading shopper OTP settings:', err);
      });
  }, []);

  const update = (id: ShopperOtpProviderId, patch: Partial<Row>) => {
    setNotice('');
    setRows((current) => current && current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const toggle = (row: Row) => {
    if (!row.enabled && INFO[row.id].fields && !configured(row)) {
      setOpen(row.id);
      setError(`أدخل مفتاح API ومعرّف القناة لتشغيل ${INFO[row.id].name}.`);
      return;
    }
    setError('');
    update(row.id, { enabled: !row.enabled });
  };

  /** Drag by the handle: the row follows the pointer across the others' midpoints. */
  const startDrag = (id: ShopperOtpProviderId) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragging(id);
    setNotice('');
    const move = (e: PointerEvent) => {
      const items = Array.from(list.current?.querySelectorAll<HTMLElement>('[data-row]') ?? []);
      const target = items.findIndex((el) => {
        const box = el.getBoundingClientRect();
        return e.clientY < box.top + box.height / 2;
      });
      setRows((current) => {
        if (!current) return current;
        const from = current.findIndex((r) => r.id === id);
        let to = target === -1 ? current.length - 1 : target;
        if (to > from) to -= 1;
        if (to === from) return current;
        const next = [...current];
        const [row] = next.splice(from, 1);
        next.splice(to, 0, row);
        return next;
      });
    };
    const end = () => {
      setDragging(null);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  const save = async () => {
    if (!rows) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await shopperService.saveOtpSettings(
        rows.map((row) => ({
          id: row.id,
          enabled: row.enabled,
          ...(INFO[row.id].fields
            ? { channelId: row.channelId.trim(), ...(row.apiKey.trim() ? { apiKey: row.apiKey.trim() } : {}) }
            : {}),
        })),
      );
      load(res.providers);
      setNotice('تم الحفظ.');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      setError(typeof message === 'string' ? message : 'تعذر حفظ الإعدادات.');
      console.error('Error saving shopper OTP settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const active = rows?.filter((row) => row.enabled) ?? [];
  const dirty = rows ? snapshot(rows) !== saved : false;

  return (
    <div className="page-shell space-y-6 bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="حسابات المتسوقين"
        description="حساب Mel واحد يعمل في كل المتاجر، ويصل رمز الدخول على واتساب."
        icon={<MessageCircle className="h-5 w-5" />}
      />

      {!rows ? (
        error ? (
          <AlertMessage>{error}</AlertMessage>
        ) : (
          <div className="grid place-items-center rounded-2xl bg-white p-10 ring-1 ring-slate-200/70">
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        )
      ) : (
        <section className="max-w-3xl overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
          <header className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-black text-slate-900">مزوّدو رمز الدخول</h2>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">يُرسل الرمز عبر الأول المفعّل، وإذا تعذّر ينتقل للتالي. اسحب الصفوف لتغيير الترتيب.</p>
            </div>
            {active.length ? (
              <ol className="flex items-center gap-1.5 text-xs font-bold text-slate-600" aria-label="ترتيب الإرسال">
                {active.map((row, i) => (
                  <li key={row.id} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1">
                    <span className="text-slate-400">{i + 1}</span>
                    {INFO[row.id].name}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs font-bold text-amber-700">كلها معطلة: يُستخدم OTPIQ احتياطياً</p>
            )}
          </header>

          <div ref={list} className="divide-y divide-slate-100">
            {rows.map((row) => {
              const info = INFO[row.id];
              const rank = active.indexOf(row);
              const expanded = open === row.id && info.fields;
              return (
                <div
                  key={row.id}
                  data-row
                  className={cn('bg-white transition-shadow', dragging === row.id && 'relative z-10 shadow-lg ring-1 ring-slate-200')}
                >
                  <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
                    <button
                      type="button"
                      onPointerDown={startDrag(row.id)}
                      aria-label={`اسحب ${info.name} لتغيير الترتيب`}
                      className={cn('grid h-9 w-7 shrink-0 touch-none place-items-center rounded-lg text-slate-300 hover:bg-slate-50 hover:text-slate-500', dragging === row.id ? 'cursor-grabbing' : 'cursor-grab')}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <img src={info.logo} alt={info.name} className={cn("h-10 w-10 shrink-0 rounded-xl object-contain", info.tile)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{info.name}</span>
                        {rank === 0 && <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-black text-emerald-700">الأساسي</span>}
                        {rank > 0 && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-black text-slate-600">احتياطي {rank.toLocaleString('ar-IQ')}</span>}
                        {info.fields && !configured(row) && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-black text-amber-700">يحتاج إعداد</span>}
                      </div>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{info.detail}</p>
                    </div>
                    {info.fields && (
                      <button
                        type="button"
                        onClick={() => setOpen(expanded ? null : row.id)}
                        aria-expanded={expanded}
                        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        الإعداد
                        <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
                      </button>
                    )}
                    <StatusSwitch active={row.enabled} label={`تشغيل ${info.name}`} onClick={() => toggle(row)} />
                  </div>

                  {expanded && (
                    <div className="grid gap-3 border-t border-dashed border-slate-100 bg-slate-50/60 px-4 py-4 sm:grid-cols-2 sm:pr-[5.5rem]">
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-slate-600">مفتاح API</span>
                        <input
                          dir="ltr"
                          type="password"
                          autoComplete="new-password"
                          className={cn(INPUT, 'text-left')}
                          value={row.apiKey}
                          placeholder={row.hasApiKey ? 'محفوظ' : 'mik_…'}
                          onChange={(e) => update(row.id, { apiKey: e.target.value })}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-slate-600">معرّف قناة واتساب</span>
                        <input dir="ltr" className={cn(INPUT, 'text-left')} value={row.channelId} onChange={(e) => update(row.id, { channelId: e.target.value })} />
                      </label>
                      <p className="text-xs font-semibold text-slate-500 sm:col-span-2">
                        من لوحة وارد: المطورون ← مفاتيح API، وقالب «رموز الدخول» معتمد في القنوات ← القوالب.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <footer className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-3">
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              حفظ
            </button>
            {dirty && !saving && <span className="text-xs font-bold text-slate-500">تغييرات غير محفوظة</span>}
            {notice && !dirty && <span className="text-xs font-bold text-emerald-700">{notice}</span>}
            {error && <span className="text-xs font-bold text-red-600">{error}</span>}
          </footer>
        </section>
      )}
    </div>
  );
};

export default ShopperAccounts;
