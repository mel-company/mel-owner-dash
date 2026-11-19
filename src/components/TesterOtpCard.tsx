import { useEffect, useState } from 'react';
import { testerOtpService, type TesterOtpSetting } from '../services/testerOtpService';

/** 9647701234567 → 07701234567 */
const localPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('964') ? `0${digits.slice(3)}` : digits;
};

const errorMessage = (err: unknown, fallback: string) => {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message[0] ?? fallback;
  return message || fallback;
};

/**
 * Tester phones that sign in with the fixed code 1212, on every sign-in
 * (merchant and shopper). No WhatsApp or SMS is sent to them.
 */
const TesterOtpCard = () => {
  const [saved, setSaved] = useState<TesterOtpSetting | null>(null);
  const [phones, setPhones] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const show = (value: TesterOtpSetting) => {
    setSaved(value);
    setPhones((value.phones ?? []).map(localPhone).join('، '));
  };

  useEffect(() => {
    testerOtpService
      .get()
      .then(show)
      .catch((err) => setError(errorMessage(err, 'تعذر تحميل أرقام التجربة')));
  }, []);

  const list = phones
    .split(/[\s,،؛;]+/)
    .map((part) => part.replace(/\D/g, ''))
    .filter(Boolean);
  const changed = !saved || list.map(localPhone).join() !== (saved.phones ?? []).map(localPhone).join();

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      show(await testerOtpService.set(list));
    } catch (err) {
      setError(errorMessage(err, 'تعذر الحفظ'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-800">رمز التجربة الثابت</div>
        <div className="text-xs text-slate-500">
          هذه الأرقام تدخل دائماً بالرمز <span dir="ltr" className="font-semibold">1212</span> ولا تصلها رسالة.
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label="أرقام التجربة"
          dir="ltr"
          value={phones}
          onChange={(event) => setPhones(event.target.value)}
          placeholder="07701234567, 07801234567"
          className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-left text-sm outline-none focus:border-slate-400"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving || !changed}
          className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-40"
        >
          {saving ? 'جارٍ الحفظ…' : 'حفظ'}
        </button>
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
};

export default TesterOtpCard;
