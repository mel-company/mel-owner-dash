import { useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, KeyRound, Loader2 } from 'lucide-react';
import { FormField } from './index';
import {
  courierService,
  type AlzaeemSettings,
} from '../../services/courierService';

/**
 * حساب المنصة لدى الزعيم.
 *
 * Al-Zaeem's login lives in the database instead of environment variables, so
 * it is edited here. The password and webhook token never come back from the
 * server: a blank password keeps the saved one, and a new token is shown once,
 * right after it is generated, to hand to Al-Zaeem with the domain.
 */
export const AlzaeemSettingsCard = ({ onSaved }: { onSaved?: () => void }) => {
  const [settings, setSettings] = useState<AlzaeemSettings | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [systemCode, setSystemCode] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    let cancelled = false;
    courierService
      .getAlzaeemSettings()
      .then((loaded) => {
        if (cancelled) return;
        setSettings(loaded);
        setUsername(loaded.username ?? '');
        setSystemCode(loaded.systemCode ?? '');
      })
      .catch((err) => {
        if (!cancelled) setError('تعذر تحميل إعدادات الزعيم.');
        console.error('Error loading Al-Zaeem settings:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (generateWebhookSecret = false) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await courierService.saveAlzaeemSettings({
        username,
        systemCode,
        ...(password ? { password } : {}),
        ...(generateWebhookSecret ? { generateWebhookSecret: true } : {}),
      });
      setSettings(saved);
      setPassword('');
      if (saved.generatedWebhookSecret) {
        setNewToken(saved.generatedWebhookSecret);
      }
      setNotice(generateWebhookSecret ? 'تم إنشاء رمز جديد.' : 'تم الحفظ.');
      onSaved?.();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: unknown } } })
        ?.response?.data?.message;
      setError(typeof message === 'string' ? message : 'تعذر حفظ الإعدادات.');
      console.error('Error saving Al-Zaeem settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void save();
  };

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1500);
    } catch {
      // Clipboard blocked; the value is on screen to copy by hand.
    }
  };

  if (!settings && !error) {
    return (
      <section className="grid place-items-center rounded-3xl bg-white p-8 ring-1 ring-slate-100">
        <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
      </section>
    );
  }

  const CopyButton = ({ label, value }: { label: string; value: string }) => (
    <button
      type="button"
      onClick={() => copy(label, value)}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-black text-slate-600 hover:bg-slate-50"
    >
      {copied === label ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      نسخ
    </button>
  );

  return (
    <section className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-slate-100">
      <div>
        <h3 className="text-sm font-black text-slate-700">حساب المنصة</h3>
        <p className="mt-1 text-xs font-semibold text-slate-400">
          {settings?.configured ? 'الحساب مُعدّ.' : 'أدخل بيانات الدخول ورمز النظام لتفعيل الزعيم.'}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <FormField label="اسم المستخدم" value={username} onChange={setUsername} />
        <FormField
          label="كلمة المرور"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder={settings?.passwordSet ? 'محفوظة — اتركها فارغة للإبقاء عليها' : ''}
        />
        <FormField
          label="رمز النظام"
          value={systemCode}
          onChange={(value) => setSystemCode(value.toUpperCase())}
          placeholder="MEL_TEST"
        />

        {error && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p>
        )}
        {notice && !error && (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          حفظ
        </button>
      </form>

      {settings && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div>
            <h3 className="text-sm font-black text-slate-700">تحديثات الحالة</h3>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              أعطِ الزعيم هذا النطاق والرمز (وضع TOKEN).
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
            <span className="truncate font-mono text-xs font-semibold text-slate-600" dir="ltr">
              {settings.webhookDomain}
            </span>
            <CopyButton label="domain" value={settings.webhookDomain} />
          </div>

          {newToken ? (
            <div className="space-y-2 rounded-xl bg-amber-50 px-3 py-3">
              <p className="text-xs font-black text-amber-700">انسخه الآن — لن يظهر مرة أخرى.</p>
              <div className="flex items-center justify-between gap-3">
                <span className="break-all font-mono text-xs font-semibold text-slate-700" dir="ltr">
                  {newToken}
                </span>
                <CopyButton label="token" value={newToken} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              <span>الرمز</span>
              <span className="font-mono" dir="ltr">
                {settings.webhookSecretSet ? `••••${settings.webhookSecretLast4 ?? ''}` : 'غير مُعدّ'}
              </span>
            </div>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() => {
              if (
                settings.webhookSecretSet &&
                !window.confirm('سيتوقف الرمز الحالي. أعطِ الزعيم الرمز الجديد بعد إنشائه. متابعة؟')
              ) {
                return;
              }
              void save(true);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-60"
          >
            <KeyRound className="h-3.5 w-3.5" />
            {settings.webhookSecretSet ? 'رمز جديد' : 'إنشاء رمز'}
          </button>
        </div>
      )}
    </section>
  );
};

export default AlzaeemSettingsCard;
