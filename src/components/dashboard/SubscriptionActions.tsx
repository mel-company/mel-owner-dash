import { useState } from 'react';
import {
  CalendarClock,
  Loader2,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import {
  AlertMessage,
  ConfirmDeleteModal,
  DrawerFooter,
  FormField,
  SelectField,
  SideDrawer,
} from '@/components/dashboard';
import {
  systemSubscriptionsService,
  type Subscription,
} from '@/services/systemSubscriptionsService';
import { plansService, type Plan } from '@/services/plansService';
import { apiErrorMessage } from '@/services/domainHealthService';

/**
 * The operator's subscription controls.
 *
 * Every one of these five routes has existed, worked and been tested on the
 * server for as long as the admin dashboard has; `systemSubscriptionsService`
 * declares all five and **no screen called any of them**. The controller comment
 * on `PUT /subscription/system/:id/renew` even names the admin dashboard as its
 * only caller. So "the operator cannot act" was never a missing API — it was a
 * missing surface.
 *
 * One component rather than two, because it is rendered from both the store
 * detail page and the subscriptions table. `Employees` and `Stores` already hold
 * two near-identical copies of a typed-name confirm between them, which is what
 * a second copy of this would become.
 *
 * Every mutation ends in `onDone()` — a refetch at the call site — rather than
 * patching local state. The server decides a status transition (it refuses to
 * resume a term that has already ended, for one), so what it wrote is the only
 * trustworthy answer, and re-reading is also what proves to the operator that
 * the write landed.
 */
type SubscriptionLike = Pick<
  Subscription,
  'id' | 'status' | 'start_at' | 'end_at'
> & {
  plan?: { id?: string; name?: string } | null;
  store?: { name?: string } | null;
};

type PendingAction = 'pause' | 'cancel' | null;

export const SubscriptionActions = ({
  subscription,
  onDone,
}: {
  subscription: SubscriptionLike;
  onDone: () => void | Promise<void>;
}) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirming, setConfirming] = useState<PendingAction>(null);
  const [showRenew, setShowRenew] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [renewMonths, setRenewMonths] = useState('1');
  const [editForm, setEditForm] = useState({
    planId: '',
    start_at: '',
    end_at: '',
  });
  const [plans, setPlans] = useState<Plan[]>([]);

  const status = subscription.status;
  /**
   * Whether the paid term still covers today. Only used to decide which buttons
   * to offer: the server refuses to resume a subscription whose `end_at` has
   * passed, and offering a control that is certain to 400 is worse than hiding
   * it.
   */
  const termIsPast = new Date(subscription.end_at).getTime() <= Date.now();

  /**
   * Which actions the server will accept, mirrored from its own guards:
   * `pause` refuses INACTIVE and CANCELLED, `resume` refuses ACTIVE, CANCELLED
   * and an expired term, `cancel` refuses CANCELLED, `renew` refuses CANCELLED.
   */
  const can = {
    pause: status !== 'INACTIVE' && status !== 'CANCELLED',
    resume: status !== 'ACTIVE' && status !== 'CANCELLED' && !termIsPast,
    renew: status !== 'CANCELLED',
    cancel: status !== 'CANCELLED',
    edit: true,
  };

  /**
   * Runs one action and reports whether it landed.
   *
   * It used to return nothing, and the drawers closed unconditionally after
   * awaiting it — so a rejected renewal closed the form and threw away what the
   * operator had typed, leaving the error on the panel behind with no way back
   * except to reopen and retype it.
   */
  const run = async (
    label: string,
    action: () => Promise<unknown>,
    done: string,
  ): Promise<boolean> => {
    try {
      setBusy(label);
      setError('');
      setNotice('');
      await action();
      setNotice(done);
      await onDone();
      return true;
    } catch (err) {
      /**
       * The server's own message. A 401 never reaches here — the axios
       * interceptor clears storage and redirects to /login globally — so there
       * is no point rendering one.
       */
      setError(apiErrorMessage(err, 'تعذر تنفيذ العملية. حاول مرة أخرى.'));
      console.error(`Subscription action ${label} failed:`, err);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const openRenew = () => {
    setRenewMonths('1');
    setError('');
    setShowRenew(true);
  };

  const openEdit = async () => {
    setEditForm({
      planId: subscription.plan?.id || '',
      start_at: toDateInput(subscription.start_at),
      end_at: toDateInput(subscription.end_at),
    });
    setError('');
    setShowEdit(true);

    // Fetched when the drawer opens, not on mount: most visits to this page
    // never touch it, and the catalogue is only needed to offer a plan.
    if (plans.length === 0) {
      try {
        const response = await plansService.getAllPlans();
        setPlans(response.data || []);
      } catch (err) {
        console.error('Could not load plans for the subscription editor:', err);
      }
    }
  };

  const submitRenew = async () => {
    const months = Number(renewMonths);
    // Checked here so the refusal reads in Arabic rather than arriving as a
    // validation error on a number this form asked for. The DTO caps it at 24.
    if (!Number.isInteger(months) || months < 1 || months > 24) {
      setError('عدد الأشهر يجب أن يكون رقماً صحيحاً بين 1 و 24.');
      return;
    }
    const ok = await run(
      'renew',
      () =>
        systemSubscriptionsService.renewSubscription(subscription.id, {
          durationMonths: months,
        }),
      `تم تجديد الاشتراك ${months} شهر.`,
    );
    // Kept open on failure so the error is beside the field that caused it and
    // the operator can correct and resubmit.
    if (ok) setShowRenew(false);
  };

  const submitEdit = async () => {
    if (!editForm.start_at || !editForm.end_at) {
      setError('تاريخ البدء وتاريخ الانتهاء مطلوبان.');
      return;
    }
    if (new Date(editForm.start_at) >= new Date(editForm.end_at)) {
      setError('تاريخ البدء يجب أن يكون قبل تاريخ الانتهاء.');
      return;
    }
    const ok = await run(
      'edit',
      () =>
        systemSubscriptionsService.updateSubscription(subscription.id, {
          ...(editForm.planId ? { planId: editForm.planId } : {}),
          // The original instants are passed so an untouched date round-trips
          // to exactly what was stored.
          start_at: fromDateInput(editForm.start_at, subscription.start_at),
          end_at: fromDateInput(editForm.end_at, subscription.end_at),
        }),
      'تم تحديث الاشتراك.',
    );
    if (ok) setShowEdit(false);
  };

  return (
    <div className="space-y-3">
      {error && <AlertMessage>{error}</AlertMessage>}
      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {notice}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {can.pause && (
          <ActionButton
            icon={<Pause className="h-4 w-4" />}
            label="إيقاف مؤقت"
            tone="amber"
            busy={busy === 'pause'}
            onClick={() => setConfirming('pause')}
          />
        )}
        {can.resume && (
          <ActionButton
            icon={<Play className="h-4 w-4" />}
            label="استئناف"
            tone="green"
            busy={busy === 'resume'}
            // Restorative, so it fires immediately — the same split
            // `PaymentMethods` makes for gateway activation.
            onClick={() =>
              run(
                'resume',
                () =>
                  systemSubscriptionsService.resumeSubscription(
                    subscription.id,
                  ),
                'تم استئناف الاشتراك.',
              )
            }
          />
        )}
        {can.renew && (
          <ActionButton
            icon={<RotateCcw className="h-4 w-4" />}
            label="تجديد"
            tone="violet"
            busy={busy === 'renew'}
            onClick={openRenew}
          />
        )}
        {can.edit && (
          <ActionButton
            icon={<Pencil className="h-4 w-4" />}
            label="تعديل المدة والخطة"
            tone="slate"
            busy={busy === 'edit'}
            onClick={openEdit}
          />
        )}
        {can.cancel && (
          <ActionButton
            icon={<XCircle className="h-4 w-4" />}
            label="إلغاء"
            tone="red"
            busy={busy === 'cancel'}
            onClick={() => setConfirming('cancel')}
          />
        )}
      </div>

      {confirming === 'pause' && (
        <ConfirmDeleteModal
          title="إيقاف الاشتراك مؤقتاً؟"
          description="سيفقد المتجر مزايا باقته حتى يُستأنف الاشتراك. مدة الاشتراك لا تتوقف."
          confirmLabel="إيقاف مؤقت"
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            setConfirming(null);
            void run(
              'pause',
              () =>
                systemSubscriptionsService.pauseSubscription(subscription.id),
              'تم إيقاف الاشتراك مؤقتاً.',
            );
          }}
        />
      )}

      {confirming === 'cancel' && (
        <ConfirmDeleteModal
          title="إلغاء الاشتراك؟"
          /* Accurate about what cancelling does: the status changes and nothing
             else. No store is deleted and no data is removed. */
          description="سيتم تغيير حالة الاشتراك إلى «ملغى». لا يُحذف المتجر ولا بياناته، ويمكن إنشاء اشتراك جديد لاحقاً."
          confirmLabel="إلغاء الاشتراك"
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            setConfirming(null);
            void run(
              'cancel',
              () =>
                systemSubscriptionsService.cancelSubscription(subscription.id),
              'تم إلغاء الاشتراك.',
            );
          }}
        />
      )}

      {showRenew && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitRenew();
          }}
        >
          <SideDrawer
            title="تجديد الاشتراك"
            subtitle={subscription.store?.name}
            icon={<CalendarClock className="h-6 w-6" />}
            maxWidth="max-w-lg"
            onClose={() => setShowRenew(false)}
            footer={
              <DrawerFooter
                onCancel={() => setShowRenew(false)}
                submitLabel="تجديد"
              />
            }
          >
            {error && <AlertMessage>{error}</AlertMessage>}
            <FormField
              label="عدد الأشهر (1 - 24)"
              type="number"
              value={renewMonths}
              required
              onChange={setRenewMonths}
            />
            <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
              التجديد من هنا يمدّ المدة بدون أي دفع. لفاتورة حقيقية يدفعها
              التاجر، استخدم مسار الدفع في لوحة التاجر.
            </p>
          </SideDrawer>
        </form>
      )}

      {showEdit && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitEdit();
          }}
        >
          <SideDrawer
            title="تعديل الاشتراك"
            subtitle={subscription.store?.name}
            icon={<Pencil className="h-6 w-6" />}
            maxWidth="max-w-lg"
            onClose={() => setShowEdit(false)}
            footer={
              <DrawerFooter
                onCancel={() => setShowEdit(false)}
                submitLabel="حفظ التغييرات"
              />
            }
          >
            {error && <AlertMessage>{error}</AlertMessage>}
            <div className="grid grid-cols-1 gap-5">
              <SelectField
                label="الخطة"
                value={editForm.planId}
                options={plans.map((plan) => ({
                  value: plan.id,
                  label: plan.name,
                }))}
                onChange={(value) =>
                  setEditForm((current) => ({ ...current, planId: value }))
                }
              />
              <FormField
                label="تاريخ البدء"
                type="date"
                value={editForm.start_at}
                required
                onChange={(value) =>
                  setEditForm((current) => ({ ...current, start_at: value }))
                }
              />
              <FormField
                label="تاريخ الانتهاء"
                type="date"
                value={editForm.end_at}
                required
                onChange={(value) =>
                  setEditForm((current) => ({ ...current, end_at: value }))
                }
              />
            </div>
          </SideDrawer>
        </form>
      )}
    </div>
  );
};

const TONES: Record<string, string> = {
  amber: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
  green: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
  violet: 'bg-violet-50 text-violet-600 hover:bg-violet-100',
  red: 'bg-red-50 text-red-600 hover:bg-red-100',
  slate: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
};

const ActionButton = ({
  icon,
  label,
  tone,
  busy,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: keyof typeof TONES | string;
  busy?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={busy}
    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition disabled:opacity-60 ${
      TONES[tone] ?? TONES.slate
    }`}
  >
    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
    {label}
  </button>
);

/**
 * `YYYY-MM-DD` for an `<input type="date">`, in the **operator's own**
 * timezone.
 *
 * This used `toISOString().slice(0,10)`, which is UTC. Baghdad is UTC+3, so a
 * term ending 2026-11-05T01:30+03:00 is stored as 2026-11-04T22:30Z and the
 * input showed 2026-11-04 — a day earlier than the date the operator sees
 * everywhere else on the page.
 */
const toDateInput = (value: string): string => {
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return '';
  const local = new Date(at.getTime() - at.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

/**
 * A `YYYY-MM-DD` from the picker back into an instant, keeping the time of day
 * the term already had.
 *
 * Writing `new Date(ymd).toISOString()` anchors to midnight **UTC**, so
 * combined with the UTC read above, opening the edit drawer and saving without
 * touching the dates moved `end_at` backwards by up to ~24 hours — a merchant
 * silently losing most of a day they had paid for. Reading local and writing
 * back the original clock time makes the round-trip lossless: an operator who
 * changes only the plan changes only the plan.
 */
const fromDateInput = (ymd: string, original?: string): string => {
  const [year, month, day] = ymd.split('-').map(Number);
  const at = original ? new Date(original) : null;
  const base =
    at && !Number.isNaN(at.getTime()) ? at : new Date(`${ymd}T00:00:00`);

  const next = new Date(base);
  next.setFullYear(year, month - 1, day);
  return next.toISOString();
};

export default SubscriptionActions;

/**
 * Creating a subscription for a store that has none.
 *
 * `createSystem` — the operator's store-creation route — creates no
 * subscription and ignores any plan it is sent, so every store made from the
 * admin dashboard arrives with no plan and no term. `POST /subscription/system`
 * is the only route that can give it one, the service had no method for it, and
 * no screen could call one. So those stores were stuck unsubscribed with
 * nothing in the product able to fix it.
 *
 * Defaults to one month from today on the first enabled plan, because that is
 * the overwhelmingly common case and an operator correcting a date is cheaper
 * than an operator entering two.
 */
export const CreateSubscriptionPanel = ({
  storeId,
  storeName,
  onDone,
}: {
  storeId: string;
  storeName?: string;
  onDone: () => void | Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState({
    planId: '',
    start_at: toDateInput(new Date().toISOString()),
    end_at: toDateInput(addMonths(new Date(), 1).toISOString()),
  });

  const openDrawer = async () => {
    setError('');
    setOpen(true);
    if (plans.length > 0) return;
    try {
      const response = await plansService.getAllPlans();
      const rows = response.data || [];
      setPlans(rows);
      // The operator still chooses; this only saves the common case a click.
      const firstEnabled = rows.find((plan) => plan.enabled);
      if (firstEnabled) {
        setForm((current) => ({ ...current, planId: firstEnabled.id }));
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'تعذر جلب الباقات.'));
    }
  };

  const submit = async () => {
    if (!form.planId) {
      setError('اختر الباقة.');
      return;
    }
    /**
     * The same guard `submitEdit` carries, and this did not.
     *
     * An empty date slips past the comparison below — `new Date('')` is an
     * Invalid Date and every comparison with NaN is false — and then
     * `fromDateInput('')` throws on `toISOString()`, surfacing as the generic
     * «تعذر إنشاء الاشتراك» instead of naming the field. The inputs are `required`
     * so a browser blocks it today; that is not a reason to leave a path that
     * throws.
     */
    if (!form.start_at || !form.end_at) {
      setError('تاريخ البدء وتاريخ الانتهاء مطلوبان.');
      return;
    }
    if (new Date(form.start_at) >= new Date(form.end_at)) {
      setError('تاريخ البدء يجب أن يكون قبل تاريخ الانتهاء.');
      return;
    }
    try {
      setBusy(true);
      setError('');
      await systemSubscriptionsService.createSubscription({
        storeId,
        planId: form.planId,
        start_at: fromDateInput(form.start_at),
        end_at: fromDateInput(form.end_at),
        status: 'ACTIVE',
      });
      setOpen(false);
      await onDone();
    } catch (err) {
      setError(apiErrorMessage(err, 'تعذر إنشاء الاشتراك.'));
      console.error('Could not create the subscription:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void openDrawer()}
        className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-violet-700"
      >
        <CalendarClock className="h-4 w-4" />
        إنشاء اشتراك
      </button>

      {open && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <SideDrawer
            title="إنشاء اشتراك"
            subtitle={storeName}
            icon={<CalendarClock className="h-6 w-6" />}
            maxWidth="max-w-lg"
            onClose={() => setOpen(false)}
            footer={
              <DrawerFooter
                onCancel={() => setOpen(false)}
                submitLabel={busy ? 'جاري الإنشاء...' : 'إنشاء الاشتراك'}
              />
            }
          >
            {error && <AlertMessage>{error}</AlertMessage>}
            <div className="grid grid-cols-1 gap-5">
              <SelectField
                label="الباقة"
                value={form.planId}
                required
                options={plans.map((plan) => ({
                  value: plan.id,
                  label: plan.enabled ? plan.name : `${plan.name} (معطلة)`,
                }))}
                onChange={(value) =>
                  setForm((current) => ({ ...current, planId: value }))
                }
              />
              <FormField
                label="تاريخ البدء"
                type="date"
                value={form.start_at}
                required
                onChange={(value) =>
                  setForm((current) => ({ ...current, start_at: value }))
                }
              />
              <FormField
                label="تاريخ الانتهاء"
                type="date"
                value={form.end_at}
                required
                onChange={(value) =>
                  setForm((current) => ({ ...current, end_at: value }))
                }
              />
            </div>
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
              هذا الاشتراك يُمنح بدون دفع. العرض الترويجي (شهر مجاني ثم 6 أشهر
              بنصف السعر) يُحسب عند الدفع ولا يُستهلك من هنا.
            </p>
          </SideDrawer>
        </form>
      )}
    </div>
  );
};

/** Whole months, matching the server's own `extendTerm`. */
const addMonths = (from: Date, months: number): Date => {
  const at = new Date(from);
  at.setMonth(at.getMonth() + months);
  return at;
};
