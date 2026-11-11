import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import { AlertMessage, FormField, PageHeader, SwitchField } from '@/components/dashboard';
import { shopperService, type ShopperOtpSettings } from '../services/shopperService';

/**
 * حسابات المتسوقين: the WhatsApp sender for the shopper sign-in code.
 *
 * With Warid off, or when Warid refuses a message, the code goes through
 * OTPIQ, so turning Warid on never risks shoppers being locked out.
 */
const ShopperAccounts = () => {
  const [settings, setSettings] = useState<ShopperOtpSettings | null>(null);
  const [warid, setWarid] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [senderId, setSenderId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fill = (loaded: ShopperOtpSettings) => {
    setSettings(loaded);
    setWarid(loaded.provider === 'warid');
    setApiUrl(loaded.apiUrl ?? '');
    setSenderId(loaded.senderId ?? '');
  };

  useEffect(() => {
    shopperService
      .getOtpSettings()
      .then(fill)
      .catch((err) => {
        setError('تعذر تحميل الإعدادات.');
        console.error('Error loading shopper OTP settings:', err);
      });
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (warid && (!apiUrl.trim() || (!apiKey.trim() && !settings?.hasApiKey))) {
      setError('أدخل عنوان الربط والمفتاح لتشغيل وارد.');
      return;
    }
    setSaving(true);
    try {
      const saved = await shopperService.saveOtpSettings({
        provider: warid ? 'warid' : 'otpiq',
        apiUrl: apiUrl.trim(),
        senderId: senderId.trim(),
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      });
      fill(saved);
      setApiKey('');
      setNotice('تم الحفظ.');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      setError(typeof message === 'string' ? message : 'تعذر حفظ الإعدادات.');
      console.error('Error saving shopper OTP settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell space-y-6 bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="حسابات المتسوقين"
        description="حساب Mel واحد يعمل في كل المتاجر. يصل رمز الدخول على واتساب."
        icon={<MessageCircle className="h-5 w-5" />}
      />

      {!settings && !error ? (
        <section className="grid place-items-center rounded-3xl bg-white p-8 ring-1 ring-slate-100">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </section>
      ) : (
        <form onSubmit={onSubmit} className="max-w-xl space-y-4 rounded-3xl bg-white p-5 ring-1 ring-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-700">مرسل رمز الدخول</h3>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {warid ? 'يُرسل عبر وارد، وعند تعذره عبر OTPIQ.' : 'يُرسل الآن عبر OTPIQ.'}
            </p>
          </div>

          <SwitchField label="وارد" checked={warid} onChange={setWarid} />

          {warid && (
            <>
              <FormField label="عنوان الربط" value={apiUrl} onChange={setApiUrl} placeholder="https://" />
              <FormField
                label="المفتاح"
                type="password"
                value={apiKey}
                onChange={setApiKey}
                placeholder={settings?.hasApiKey ? 'محفوظ — اتركه فارغاً للإبقاء عليه' : ''}
              />
              <FormField label="اسم المرسل" value={senderId} onChange={setSenderId} placeholder="Mel" />
            </>
          )}

          {error && <AlertMessage>{error}</AlertMessage>}
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
      )}
    </div>
  );
};

export default ShopperAccounts;
