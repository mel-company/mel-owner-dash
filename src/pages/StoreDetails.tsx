import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, ExternalLink, Globe, Mail, MapPin, Package, Phone, ShoppingBag, Store as StoreIcon, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  AlertMessage,
  LoadingState,
  PageHeader,
  PrimaryActionButton,
  StatCard,
  StatusPill,
  TableShell,
} from '@/components/dashboard';
import { StoreCourierAccounts } from '@/components/dashboard/StoreCourierAccounts';
import {
  CreateSubscriptionPanel,
  SubscriptionActions,
} from '@/components/dashboard/SubscriptionActions';
import {
  subscriptionStatusLabel,
  subscriptionStatusTone,
} from '@/utils/subscriptionStatus';
import { systemStoresService, type Store } from '../services/systemStoresService';

const publicAssetBaseUrl = import.meta.env.VITE_PUBLIC_URL || 'https://pub-fe6c304a027a4a3b9e3efb4fd3520dcf.r2.dev/';

const StoreDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) fetchStoreDetails(id);
  }, [id]);

  const fetchStoreDetails = async (storeId: string) => {
    try {
      setLoading(true);
      setError('');
      const storeData = await systemStoresService.getStoreById(storeId);
      setStore(storeData);
    } catch (err) {
      setError('فشل في جلب تفاصيل المتجر. يرجى المحاولة مرة أخرى.');
      console.error('Error fetching store details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState />;

  if (error || !store) {
    return (
      <div className="page-shell bg-[#f8fafc]" dir="rtl">
        <AlertMessage>{error || 'المتجر غير موجود'}</AlertMessage>
        <PrimaryActionButton onClick={() => navigate('/dashboard/stores')}>العودة إلى المتاجر</PrimaryActionButton>
      </div>
    );
  }

  const logo = getPublicAssetUrl(store.logo);
  const subscriptionStatus = effectiveSubscriptionStatus(store.subscription);
  const courierName = store.deliveryCompany?.name?.trim() || '';
  const storeUrl = getStorePublicUrl(store);
  const domainLabel = getStorePublicHostLabel(store);
  const storeLinks = getStoreDomainLinks(store);
  const primaryLink = storeLinks.find((link) => link.primary) ?? storeLinks[0];

  return (
    <div className="page-shell bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title={store.name}
        description="تفاصيل المتجر الكاملة ومعلومات الاشتراك والمالك"
        icon={logo ? <img src={logo} alt="" className="h-8 w-8 rounded-xl object-cover" /> : <StoreIcon className="h-6 w-6" />}
        action={<PrimaryActionButton onClick={() => navigate('/dashboard/stores')}><ArrowRight className="h-4 w-4" />العودة إلى المتاجر</PrimaryActionButton>}
      />

      <div className="grid grid-cols-2 max-md:[&>*:last-child:nth-child(odd)]:col-span-2 gap-4 md:grid-cols-4">
        <StatCard title="نوع المتجر" value={getStoreType(store.store_type)} icon={<StoreIcon />} tone="blue" hint={null} />
        <StatCard title="حالة الاشتراك" value={subscriptionStatusLabel(subscriptionStatus)} icon={<CalendarDays />} tone={subscriptionStatus === 'ACTIVE' ? 'teal' : 'amber'} hint={null} />
        <StatCard title="المالك" value={store.owner?.name || 'غير محدد'} icon={<UserRound />} tone="violet" hint={null} />
        <StatCard
          title="النطاق"
          value={
            primaryLink ? (
              <a
                href={primaryLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 text-cyan-700 underline-offset-4 transition hover:text-cyan-900 hover:underline"
                title="فتح المتجر"
              >
                <span className="truncate" dir="ltr">
                  {hostOf(primaryLink.url) || domainLabel}
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            ) : (
              'غير محدد'
            )
          }
          icon={<Globe />}
          tone="cyan"
          hint={null}
        />
      </div>

      {/* Live (not soft-deleted) counts from the detail route's `_count`. */}
      {store._count && (
        <div className="grid grid-cols-2 gap-4">
          <StatCard title="الطلبات" value={store._count.orders ?? '—'} icon={<ShoppingBag />} tone="blue" hint={null} />
          <StatCard title="المنتجات" value={store._count.products ?? '—'} icon={<Package />} tone="violet" hint={null} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <DetailsCard title="المعلومات الأساسية">
          <InfoItem label="اسم المتجر" value={store.name} />
          <InfoItem label="الوصف" value={store.description || 'لا يوجد وصف'} />
          <InfoItem label="نوع المتجر" value={getStoreType(store.store_type)} />
          <InfoItem label="الموقع" value={store.location || 'غير محدد'} icon={<MapPin className="h-4 w-4" />} />
          <InfoItem label="البريد" value={store.email || 'غير محدد'} icon={<Mail className="h-4 w-4" />} />
          <InfoItem label="الهاتف" value={store.phone || 'غير محدد'} icon={<Phone className="h-4 w-4" />} />
        </DetailsCard>

        <DetailsCard title="معلومات المالك">
          <InfoItem label="اسم المالك" value={store.owner?.name || 'غير محدد'} />
          <InfoItem label="البريد الإلكتروني" value={store.owner?.email || 'غير محدد'} />
          <InfoItem label="الهاتف" value={store.owner?.phone || 'غير محدد'} />
          <InfoItem label="الموقع" value={store.owner?.location || 'غير محدد'} />
          <InfoItem label="معرف المالك" value={store.ownerId || 'غير محدد'} />
        </DetailsCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <DetailsCard title="معلومات الاشتراك">
          {store.subscription ? (
            <>
              <div className="mb-4 flex items-center justify-between rounded-2xl bg-violet-50 px-4 py-3">
                <StatusPill tone={subscriptionStatusTone(subscriptionStatus)}>
                  {subscriptionStatusLabel(subscriptionStatus)}
                </StatusPill>
                <div>
                  <p className="text-sm font-bold text-slate-400">الخطة</p>
                  <p className="text-lg font-black text-violet-700">{store.subscription.plan.name}</p>
                </div>
              </div>
              <InfoItem label="وصف الخطة" value={store.subscription.plan.description} />
              <InfoItem label="تاريخ البدء" value={formatDate(store.subscription.start_at)} />
              <InfoItem label="تاريخ الانتهاء" value={formatDate(store.subscription.end_at)} />

              {/* This card was read-only, while all five operator routes
                  existed on the server with no caller at all. */}
              <div className="pt-2">
                <SubscriptionActions
                  subscription={{
                    ...store.subscription,
                    store: { name: store.name },
                  }}
                  onDone={() => (id ? fetchStoreDetails(id) : undefined)}
                />
              </div>
            </>
          ) : (
            /* An operator-created store arrives here: `createSystem` makes no
               subscription at all, and until now nothing in the dashboard could
               give it one. */
            <div className="space-y-4">
              <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-400">
                لا يوجد اشتراك مرتبط بهذا المتجر
              </p>
              {id && (
                <CreateSubscriptionPanel
                  storeId={id}
                  storeName={store.name}
                  onDone={() => fetchStoreDetails(id)}
                />
              )}
            </div>
          )}
        </DetailsCard>

        <DetailsCard title="الروابط والنطاق">
          {storeLinks.length > 0 ? (
            <div className="space-y-2">
              {storeLinks.map((link) => (
                <div
                  key={link.type}
                  className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${
                    link.primary ? 'bg-cyan-50 ring-1 ring-cyan-100' : 'bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 text-right">
                    <p className="text-xs font-semibold text-slate-400">
                      {link.label}
                      {link.primary ? ' · الرئيسي' : ''}
                    </p>
                    <p
                      className="truncate text-sm font-bold text-slate-800"
                      dir="ltr"
                      title={link.url}
                    >
                      {hostOf(link.url)}
                    </p>
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-bold text-violet-700 shadow-sm ring-1 ring-slate-100 transition hover:bg-violet-50 hover:text-violet-900"
                  >
                    فتح
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <InfoItem
              label="رابط المتجر"
              value={
                storeUrl && domainLabel ? (
                  <StorefrontLink href={storeUrl} label={domainLabel} />
                ) : (
                  'غير محدد'
                )
              }
            />
          )}
          <InfoItem label="آخر تحديث للنطاق" value={store.domain_last_update ? formatDate(store.domain_last_update) : 'غير محدد'} />
          <InfoItem label="Instagram" value={store.instagram || 'غير محدد'} />
          <InfoItem label="Facebook" value={store.facebook || 'غير محدد'} />
          <InfoItem label="TikTok" value={store.tiktok || 'غير محدد'} />
          <InfoItem label="X" value={store.x || 'غير محدد'} />
        </DetailsCard>
      </div>

      <TableShell>
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
              <th className="px-5 py-5 text-right">المعلومة</th>
              <th className="px-5 py-5 text-right">القيمة</th>
              <th className="px-5 py-5 text-right">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <SummaryRow label="العملة" value={store.currency || 'غير محدد'} />
            <SummaryRow label="اللغة" value={store.language || 'غير محدد'} />
            <SummaryRow label="المنطقة الزمنية" value={store.timezone || 'غير محدد'} />
            {/* Was the raw deliveryCompanyId (a UUID) with a «متوفر» pill. */}
            <SummaryRow
              label="شركة الشحن"
              value={courierName || (store.deliveryCompanyId ? 'غير معروفة' : 'غير مربوط')}
              missing={!store.deliveryCompanyId}
            />
          </tbody>
        </table>
      </TableShell>

      {/* Prime and Boxy refuse to dispatch until this store's branch is
          recorded, and this is the only screen that can record it. */}
      <StoreCourierAccounts storeId={store.id} />
    </div>
  );
};

const DetailsCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
    <h2 className="mb-5 text-xl font-black text-slate-950">{title}</h2>
    <div className="space-y-3">{children}</div>
  </div>
);

const InfoItem = ({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
    {/* label first under dir=rtl → right side; value follows to the left */}
    <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-400">
      {label}
      {icon}
    </span>
    <span className="min-w-0 truncate text-left font-bold text-slate-800" dir="auto">
      {value}
    </span>
  </div>
);

const StorefrontLink = ({ href, label }: { href: string; label: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex max-w-full items-center gap-1.5 text-violet-700 underline-offset-4 transition hover:text-violet-900 hover:underline"
    title="فتح المتجر"
  >
    <span className="truncate" dir="ltr">{label}</span>
    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
  </a>
);

/** Same rule as backend `getPublicStoreUrl`: custom domain wins over *.mel.iq. */
const getStorePublicUrl = (store: Store) => {
  const custom = store.customDomain?.trim().toLowerCase().replace(/^www\./, '');
  if (custom) return `https://${custom}`;
  if (store.storeUrl) return store.storeUrl;
  if (!store.domain) return null;
  return `https://${store.domain}.mel.iq`;
};

const getStorePublicHostLabel = (store: Store) => {
  const custom = store.customDomain?.trim().toLowerCase().replace(/^www\./, '');
  if (custom) return custom;
  if (store.domain) return `${store.domain}.mel.iq`;
  return null;
};

const hostOf = (url?: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0] || null;
  }
};

/** Rebuild from domain fields so a platform-only `links[]` never hides custom. */
const getStoreDomainLinks = (store: Store) => {
  const links: NonNullable<Store['links']> = [];
  const platformUrl =
    store.platformUrl ||
    (store.domain ? `https://${store.domain}.mel.iq` : null);
  const custom = store.customDomain?.trim().toLowerCase().replace(/^www\./, '');

  if (platformUrl) {
    links.push({
      type: 'platform',
      label: 'رابط MEL',
      url: platformUrl,
      primary: !custom,
    });
  }
  if (custom) {
    links.push({
      type: 'custom',
      label: 'النطاق المخصص',
      url: `https://${custom}`,
      primary: true,
    });
  }
  return links.length ? links : store.links ?? [];
};

const SummaryRow = ({ label, value, missing = value === 'غير محدد' }: { label: string; value: string; missing?: boolean }) => (
  <tr className="text-sm text-slate-700 transition hover:bg-slate-50/70">
    <td className="px-5 py-4 text-right font-black text-slate-950">{label}</td>
    <td className="px-5 py-4 text-right font-semibold text-slate-600" dir="auto">{value}</td>
    <td className="px-5 py-4 text-right">
      <StatusPill tone={missing ? 'slate' : 'green'}>
        {missing ? 'ناقص' : 'متوفر'}
      </StatusPill>
    </td>
  </tr>
);

/**
 * The status to show, not the raw column: the server's auto-expire job is off
 * by default, so an ACTIVE subscription past its `end_at` is really expired.
 */
const effectiveSubscriptionStatus = (subscription: Store['subscription']) => {
  if (!subscription) return undefined;
  if (
    subscription.status === 'ACTIVE' &&
    new Date(subscription.end_at).getTime() < Date.now()
  ) {
    return 'EXPIRED' as const;
  }
  return subscription.status;
};

const getPublicAssetUrl = (path?: string | null) => {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
  return `${publicAssetBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
};

const getStoreType = (type?: string | null) => type === 'ECOMMERCE' ? 'متجر إلكتروني' : type || 'غير محدد';

const formatDate = (date: string) => new Date(date).toLocaleDateString('ar-IQ');

export default StoreDetails;
