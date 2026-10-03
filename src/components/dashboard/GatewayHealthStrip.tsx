import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { StatusPill } from './index';
import {
  paymentGatewaysService,
  type PaymentGatewayHealth,
} from '../../services/paymentGatewaysService';

/**
 * هل تستطيع المنصة التحصيل عبر كل بوابة الآن؟
 *
 * Operational state, not catalogue, so it sits above the tabs rather than
 * inside one: an operator asking "why is nobody able to pay" should not have
 * to pick the right tab first.
 *
 * Three facts are shown apart because they are three questions. The strings
 * being set is not the same as the gateway accepting them, and sandbox is not
 * production. The one that matters most is the last: a gateway with no
 * credentials is never reported as live, because `ZAINCASH_IS_TEST` defaults
 * to test and a forgotten variable means ~250 IQD charged against an order
 * marked fully paid.
 */
export const GatewayHealthStrip = () => {
  const [gateways, setGateways] = useState<PaymentGatewayHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const response = await paymentGatewaysService.getGateways();
      setGateways(response.data ?? []);
    } catch (err) {
      setError('تعذر قراءة حالة بوابات الدفع.');
      console.error('Error loading payment gateways:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /**
   * A real round trip to someone else's production payment system, so it is a
   * button and never part of the page load.
   */
  const probe = async (gateway: PaymentGatewayHealth) => {
    setProbing(gateway.gateway);
    setError('');
    try {
      const checked = await paymentGatewaysService.checkGateway(gateway.gateway);
      setGateways((rows) =>
        rows.map((row) => (row.gateway === checked.gateway ? checked : row)),
      );
    } catch (err) {
      setError(`تعذر فحص الاتصال بـ ${gateway.name}.`);
      console.error('Error probing payment gateway:', err);
    } finally {
      setProbing(null);
    }
  };

  if (loading || gateways.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-black text-slate-700">حالة بوابات الدفع</h2>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {gateways.map((gateway) => (
          <article
            key={gateway.gateway}
            className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                  <img
                    src={gateway.logoUrl}
                    alt=""
                    className="h-8 w-8 object-contain"
                    /* The CDN is the platform's own, but a broken logo must
                       not leave an empty box where a brand should be. */
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <p className="font-black text-slate-950">{gateway.name}</p>
                  <p className="text-xs font-semibold text-slate-400">
                    {gateway.gateway}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <StatusPill tone={gateway.production ? 'green' : 'amber'}>
                  {gateway.production ? 'إنتاجي' : 'تجريبي'}
                </StatusPill>
                <StatusPill tone={gateway.configured ? 'blue' : 'red'}>
                  {gateway.configured ? 'مهيأة' : 'اعتماديات ناقصة'}
                </StatusPill>
              </div>
            </div>

            {gateway.missingCredentials.length > 0 && (
              <div className="mt-4 rounded-2xl bg-orange-50 px-4 py-3">
                <p className="flex items-center gap-2 text-xs font-black text-orange-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  متغيّرات مفقودة في ملف البيئة
                </p>
                <ul className="mt-2 space-y-1" dir="ltr">
                  {gateway.missingCredentials.map((name) => (
                    <li
                      key={name}
                      className="font-mono text-xs font-semibold text-orange-700"
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-4 text-xs font-semibold leading-relaxed text-slate-500">
              {gateway.reason}
            </p>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold">
                {gateway.credentialsValid ? (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    الاعتماديات صحيحة
                    {gateway.latencyMs !== null && (
                      <span className="text-slate-400"> · {gateway.latencyMs}ms</span>
                    )}
                  </span>
                ) : (
                  <span className="text-slate-400">لم يتم التحقق بعد</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => probe(gateway)}
                disabled={probing !== null || !gateway.configured}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                /* Probing an unconfigured gateway can only report what the
                   card already says, and would spend a request saying it. */
                title={
                  gateway.configured
                    ? 'إجراء اتصال حقيقي بالبوابة للتحقق من الاعتماديات'
                    : 'أضف الاعتماديات الناقصة أولاً'
                }
              >
                {probing === gateway.gateway ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Activity className="h-3.5 w-3.5" />
                )}
                فحص الاتصال
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
