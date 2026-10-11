import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Infinity as InfinityIcon } from 'lucide-react';
import {
  ActionButtons,
  AlertMessage,
  ConfirmDeleteModal,
  DrawerFooter,
  EmptyState,
  FormField,
  LoadingState,
  PageHeader,
  PrimaryActionButton,
  SideDrawer,
  StatusPill,
  TableShell,
} from '@/components/dashboard';
import { unlimitedAiService, type UnlimitedAiPhone } from '../services/unlimitedAiService';

/**
 * Accounts with unlimited AI credits.
 *
 * Their store generations are never charged to a balance, but each number is
 * still capped per day (20 by default) so one account cannot run up the AI
 * bill. The day resets at midnight Baghdad time, and a build that fails does
 * not count against it.
 */

const DEFAULT_DAILY_LIMIT = 20;

type FormState = { phone: string; note: string; dailyGenerationLimit: string };

const emptyForm: FormState = { phone: '', note: '', dailyGenerationLimit: String(DEFAULT_DAILY_LIMIT) };

const errorMessage = (err: unknown, fallback: string) => {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message[0] ?? fallback;
  return message || fallback;
};

/** `+9647701234567` → `0770 123 4567`, the way merchants write it. */
const formatPhone = (phone: string) => {
  const local = phone.replace(/^\+?964/, '0');
  return local.length === 11 ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : phone;
};

const UnlimitedAi = () => {
  const [rows, setRows] = useState<UnlimitedAiPhone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<UnlimitedAiPhone | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toRemove, setToRemove] = useState<UnlimitedAiPhone | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setRows(await unlimitedAiService.list());
    } catch (err) {
      setError(errorMessage(err, 'تعذر تحميل الأرقام'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setShowDrawer(true);
  };

  const openEdit = (row: UnlimitedAiPhone) => {
    setEditing(row);
    setForm({ phone: row.phone, note: row.note ?? '', dailyGenerationLimit: String(row.dailyGenerationLimit) });
    setFormError('');
    setShowDrawer(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setShowDrawer(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const limit = Number(form.dailyGenerationLimit);
    if (!Number.isInteger(limit) || limit < 0 || limit > 1000) {
      setFormError('الحد اليومي يجب أن يكون رقماً صحيحاً بين 0 و 1000');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        await unlimitedAiService.update(editing.id, { note: form.note, dailyGenerationLimit: limit });
      } else {
        await unlimitedAiService.add({ phone: form.phone, note: form.note || undefined, dailyGenerationLimit: limit });
      }
      setShowDrawer(false);
      await load();
    } catch (err) {
      setFormError(errorMessage(err, 'تعذر حفظ الرقم'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    try {
      await unlimitedAiService.remove(toRemove.id);
      setToRemove(null);
      await load();
    } catch (err) {
      setToRemove(null);
      setError(errorMessage(err, 'تعذر حذف الرقم'));
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="page-shell space-y-6 bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="الذكاء الاصطناعي غير المحدود"
        description={`أرقام لا يُخصم منها رصيد الذكاء الاصطناعي، بحد يومي لإنشاء المتاجر (${DEFAULT_DAILY_LIMIT} افتراضياً). يبدأ اليوم من منتصف الليل بتوقيت بغداد.`}
        icon={<InfinityIcon className="h-5 w-5" />}
        action={<PrimaryActionButton onClick={openCreate}>إضافة رقم</PrimaryActionButton>}
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      <TableShell>
        {rows.length === 0 ? (
          <EmptyState
            title="لا توجد أرقام غير محدودة"
            action={<PrimaryActionButton onClick={openCreate}>إضافة رقم</PrimaryActionButton>}
          />
        ) : (
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
                <th className="px-5 py-5 text-right">رقم الهاتف</th>
                <th className="px-5 py-5 text-right">الحساب</th>
                <th className="px-5 py-5 text-right">ملاحظة</th>
                <th className="px-5 py-5 text-right">متاجر اليوم</th>
                <th className="px-5 py-5 text-right">العمليات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const reached = row.usedToday >= row.dailyGenerationLimit;
                return (
                  <tr key={row.id} className="text-sm text-slate-700 transition hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-black text-slate-950">
                      <span dir="ltr">{formatPhone(row.phone)}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {row.user ? row.user.name || 'بدون اسم' : <span className="text-slate-400">لم يسجّل بعد</span>}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{row.note || '—'}</td>
                    <td className="px-5 py-4">
                      <StatusPill tone={reached ? 'red' : 'violet'}>
                        {row.usedToday} من {row.dailyGenerationLimit}
                        {reached ? ' · وصل الحد' : ''}
                      </StatusPill>
                    </td>
                    <td className="px-5 py-4">
                      <ActionButtons
                        subject={formatPhone(row.phone)}
                        onEdit={() => openEdit(row)}
                        onDelete={() => setToRemove(row)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableShell>

      {showDrawer && (
        <form onSubmit={handleSubmit}>
          <SideDrawer
            title={editing ? 'تعديل الرقم' : 'إضافة رقم غير محدود'}
            subtitle={editing ? formatPhone(editing.phone) : undefined}
            icon={<InfinityIcon className="h-6 w-6" />}
            maxWidth="max-w-xl"
            onClose={closeDrawer}
            footer={<DrawerFooter onCancel={closeDrawer} submitLabel={saving ? 'جاري الحفظ…' : editing ? 'حفظ التغييرات' : 'إضافة الرقم'} />}
          >
            <div className="grid grid-cols-1 gap-5">
              {!editing && (
                <FormField
                  label="رقم الهاتف"
                  value={form.phone}
                  placeholder="07701234567"
                  type="tel"
                  required
                  onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
                />
              )}
              <FormField
                label="ملاحظة"
                value={form.note}
                placeholder="مثلاً: حساب تجريبي لفريق المبيعات"
                onChange={(value) => setForm((current) => ({ ...current, note: value }))}
              />
              <FormField
                label="الحد اليومي لإنشاء المتاجر"
                value={form.dailyGenerationLimit}
                type="number"
                required
                onChange={(value) => setForm((current) => ({ ...current, dailyGenerationLimit: value }))}
              />
              {formError && <AlertMessage>{formError}</AlertMessage>}
            </div>
          </SideDrawer>
        </form>
      )}

      {toRemove && (
        <ConfirmDeleteModal
          title="حذف الرقم"
          description={`سيعود ${formatPhone(toRemove.phone)} إلى الرصيد العادي ولن يتمكن من إنشاء متاجر مجاناً.`}
          onClose={() => setToRemove(null)}
          onConfirm={() => void handleRemove()}
        />
      )}
    </div>
  );
};

export default UnlimitedAi;
