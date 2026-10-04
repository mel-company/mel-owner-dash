import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Truck } from 'lucide-react';
import { StatusPill } from './index';
import {
  courierService,
  type SetCourierBranchPayload,
  type StoreCourierAccount,
} from '../../services/courierService';
import { apiErrorMessage } from '../../services/domainHealthService';

/**
 * فروع هذا المتجر لدى شركات الشحن.
 *
 * The platform holds one account at each courier and a merchant is a *branch*
 * under it. Two of the four refuse to dispatch until that branch is recorded:
 * Prime wants the shop id `create-merchant-shop` returned, Boxy wants the uid
 * of the merchant's pick-up location. Neither has a safe default — Boxy's own
 * default location is some other merchant's shop, so a parcel would be
 * collected from the wrong address — and both fail at the moment a real order
 * is dispatched rather than when the store is set up.
 *
 * This is the only screen that can set them. The route is system-guarded on
 * purpose: a merchant who could write these fields could point their parcels
 * at another merchant's warehouse.
 *
 * Modon Express and Al-Waseet appear here too, and deliberately read-only:
 * they need no branch, and the credential they *can* take is the merchant's
 * own login, which the merchant supplies from their own dashboard. An
 * operator should see whether one is stored, never set or read it.
 */

/** The label and help text for each branch field, by its server-side name. */
const FIELD_COPY: Record<string, { label: string; hint: string }> = {
  senderId: {
    label: 'معرّف المتجر لدى Prime (senderId)',
    hint: 'رقم المتجر الذي يعيده create-merchant-shop. ترفض Prime الشحنة بدونه.',
  },
  merchantLoginId: {
    label: 'حساب التاجر لدى Prime (merchantLoginId)',
    hint: 'اختياري — عند تركه فارغًا تُستخدم بيانات المنصة (PRIME_LOGIN).',
  },
  pickUpAddressUid: {
    label: 'عنوان الاستلام لدى Boxy (pickUpAddressUid)',
    hint: 'العنوان الذي يستلم منه المندوب. قيمة خاطئة ترسل المندوب إلى متجر آخر.',
  },
};

type Draft = {
  merchantLoginId: string;
  senderId: string;
  pickUpAddressUid: string;
  active: boolean;
};

const draftFrom = (entry: StoreCourierAccount): Draft => ({
  merchantLoginId: entry.account?.merchantLoginId ?? '',
  senderId:
    entry.account?.senderId === null || entry.account?.senderId === undefined
      ? ''
      : String(entry.account.senderId),
  pickUpAddressUid: entry.account?.pickUpAddressUid ?? '',
  // A store with no row yet is being provisioned, so the sensible default is
  // on — an operator filling this in means to use it.
  active: entry.account?.active ?? true,
});

export const StoreCourierAccounts = ({ storeId }: { storeId: string }) => {
  const [entries, setEntries] = useState<StoreCourierAccount[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await courierService.getStoreAccounts(storeId);
      setEntries(rows);
      setDrafts(
        Object.fromEntries(rows.map((row) => [row.courierCode, draftFrom(row)])),
      );
    } catch (err) {
      setError(apiErrorMessage(err, 'تعذر قراءة فروع المتجر لدى شركات الشحن.'));
      console.error('Error loading store courier accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (entry: StoreCourierAccount) => {
    const draft = drafts[entry.courierCode];
    if (!draft) return;

    setSaving(entry.courierCode);
    setError('');
    setSaved(null);

    /**
     * Only the fields this courier actually reads are sent.
     *
     * Posting every field would write a Boxy uid onto a Prime row — harmless
     * today because each adapter reads only its own, and exactly the kind of
     * stored nonsense that makes the next bug hard to read.
     */
    const fields = [...entry.requiredBranchFields, ...entry.optionalBranchFields];
    const payload: SetCourierBranchPayload = { active: draft.active };

    if (fields.includes('merchantLoginId')) {
      payload.merchantLoginId = draft.merchantLoginId.trim() || null;
    }
    if (fields.includes('pickUpAddressUid')) {
      payload.pickUpAddressUid = draft.pickUpAddressUid.trim() || null;
    }
    if (fields.includes('senderId')) {
      const raw = draft.senderId.trim();
      // The server validates @IsInt @Min(1); sending '' or NaN would be a 400
      // reading as a server fault rather than an empty box.
      payload.senderId = raw === '' ? null : Number(raw);
      if (payload.senderId !== null && !Number.isInteger(payload.senderId)) {
        setSaving(null);
        setError('معرّف المتجر لدى Prime يجب أن يكون رقمًا صحيحًا.');
        return;
      }
    }

    try {
      await courierService.setBranch(storeId, entry.courierCode, payload);
      setSaved(entry.courierCode);
      // Re-read rather than patch: `accountReady` and `accountMissing` are
      // the server's conclusion, and recomputing them here would be a second
      // implementation of the rule that decides whether a parcel can ship.
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'تعذر حفظ بيانات الفرع.'));
      console.error('Error saving courier branch:', err);
    } finally {
      setSaving(null);
    }
  };

  const setField = (code: string, field: keyof Draft, value: string | boolean) =>
    setDrafts((current) => ({
      ...current,
      [code]: { ...current[code], [field]: value } as Draft,
    }));

  if (loading) {
    return (
      <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          جارٍ قراءة فروع الشحن…
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="mb-2 flex items-center gap-2">
        <Truck className="h-5 w-5 text-slate-400" />
        <h2 className="text-xl font-black text-slate-950">
          فروع المتجر لدى شركات الشحن
        </h2>
      </div>
      <p className="mb-5 text-sm font-semibold leading-relaxed text-slate-400">
        تحتفظ المنصة بحساب واحد لدى كل شركة، وهذا المتجر فرع ضمنه. بعض الشركات
        ترفض الشحن حتى يُسجَّل الفرع — ويظهر الرفض عند أول طلب حقيقي.
      </p>

      {error && (
        <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {entries.map((entry) => {
          const draft = drafts[entry.courierCode];
          const fields = [
            ...entry.requiredBranchFields,
            ...entry.optionalBranchFields,
          ];

          return (
            <div
              key={entry.courierCode}
              className="rounded-3xl bg-slate-50/70 p-5 ring-1 ring-slate-100"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-slate-950">
                    {entry.displayName}
                  </p>
                  <p className="text-xs font-semibold text-slate-400" dir="ltr">
                    {entry.courierCode}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {/* Said outright, because an empty form and a form nobody
                      has filled in look identical. */}
                  {!entry.supportsBranches && (
                    <StatusPill tone="slate">لا يدعم الفروع</StatusPill>
                  )}
                  <StatusPill tone={entry.accountReady ? 'green' : 'amber'}>
                    {entry.accountReady ? 'جاهز للشحن' : 'ينقصه إعداد'}
                  </StatusPill>
                </div>
              </div>

              {!entry.accountReady && entry.accountMissing.length > 0 && (
                <p className="mt-3 flex items-center gap-2 text-xs font-black text-orange-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  ترفض هذه الشركة الشحن حتى يُسجَّل:{' '}
                  <span dir="ltr">{entry.accountMissing.join('، ')}</span>
                </p>
              )}

              {fields.length === 0 ? (
                /* Modon and Al-Waseet: nothing for an operator to provision.
                   The only identity they take is the merchant's own login,
                   and that is the merchant's to supply. */
                <div className="mt-4 space-y-2 text-xs font-semibold text-slate-500">
                  {/* The vendor's own reason, from the catalogue — so the
                      server and this screen cannot disagree about why there
                      is no form here. */}
                  <p className="leading-relaxed">
                    {entry.branchNoteAr ||
                      'لا تحتاج هذه الشركة إلى إعداد من المنصة — تُشحن الطلبات عبر حساب المنصة نفسه.'}
                  </p>
                  {/* Deployment-wide, shown beside the courier it blocks:
                      without a key the merchant's settings page cannot offer
                      the form at all, and these two couriers have no other
                      way to file parcels under the merchant's own name. */}
                  {entry.acceptsMerchantCredentials && !entry.canStoreCredentials && (
                    <p className="flex items-center gap-2 font-black text-orange-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      ربط حساب التاجر معطّل — CREDENTIALS_ENCRYPTION_KEY غير
                      مضبوط في بيئة الخادم.
                    </p>
                  )}
                  {entry.acceptsMerchantCredentials && entry.canStoreCredentials && (
                    <p className="flex items-center gap-2">
                      {entry.account?.hasPassword ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          التاجر سجّل حسابه الخاص
                          {entry.account.username && (
                            <span dir="ltr" className="font-mono">
                              ({entry.account.username})
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-400">
                          لم يسجّل التاجر حسابه الخاص — تُستخدم بيانات المنصة.
                        </span>
                      )}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {entry.branchNoteAr && (
                    <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-500">
                      {entry.branchNoteAr}
                    </p>
                  )}
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {fields.map((field) => {
                      const copy = FIELD_COPY[field];
                      const required = entry.requiredBranchFields.includes(field);

                      return (
                        <div key={field}>
                          <label className="mb-1.5 block text-xs font-black text-slate-600">
                            {copy?.label ?? field}
                            {required && (
                              <span className="text-red-500"> *</span>
                            )}
                          </label>
                          <input
                            value={draft?.[field as keyof Draft] as string}
                            onChange={(event) =>
                              setField(
                                entry.courierCode,
                                field as keyof Draft,
                                event.target.value,
                              )
                            }
                            dir="ltr"
                            className="h-12 w-full rounded-2xl border border-slate-100 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-violet-300"
                          />
                          {copy?.hint && (
                            <p className="mt-1.5 text-xs font-semibold text-slate-400">
                              {copy.hint}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={draft?.active ?? true}
                        onChange={(event) =>
                          setField(
                            entry.courierCode,
                            'active',
                            event.target.checked,
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      {/* Off keeps the ids but stops using them, which for
                          Prime and Boxy means the store cannot ship. */}
                      مُفعّل
                    </label>

                    <div className="flex items-center gap-3">
                      {saved === entry.courierCode && saving === null && (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          تم الحفظ
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => save(entry)}
                        disabled={saving !== null}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                      >
                        {saving === entry.courierCode && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        )}
                        حفظ
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
