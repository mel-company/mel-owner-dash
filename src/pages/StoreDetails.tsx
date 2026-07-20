import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Globe, Mail, MapPin, Phone, Store as StoreIcon, UserRound } from 'lucide-react';
import {
  AlertMessage,
  LoadingState,
  PageHeader,
  PrimaryActionButton,
  StatCard,
  StatusPill,
  TableShell,
} from '@/components/dashboard';
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
      <div className="min-h-screen space-y-5 bg-[#f8fafc]" dir="rtl">
        <AlertMessage>{error || 'المتجر غير موجود'}</AlertMessage>
        <PrimaryActionButton onClick={() => navigate('/dashboard/stores')}>العودة إلى المتاجر</PrimaryActionButton>
      </div>
    );
  }

  const logo = getPublicAssetUrl(store.logo);
  const subscriptionStatus = store.subscription?.status;

  return (
    <div className="min-h-screen space-y-5 bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title={store.name}
        description="تفاصيل المتجر الكاملة ومعلومات الاشتراك والمالك"
        icon={logo ? <img src={logo} alt="" className="h-8 w-8 rounded-xl object-cover" /> : <StoreIcon className="h-6 w-6" />}
        action={<PrimaryActionButton onClick={() => navigate('/dashboard/stores')}><ArrowRight className="h-4 w-4" />العودة إلى المتاجر</PrimaryActionButton>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="نوع المتجر" value={getStoreType(store.store_type)} icon={<StoreIcon />} tone="blue" hint={null} />
        <StatCard title="حالة الاشتراك" value={getStatusText(subscriptionStatus)} icon={<CalendarDays />} tone={subscriptionStatus === 'ACTIVE' ? 'teal' : 'amber'} hint={null} />
        <StatCard title="المالك" value={store.owner?.name || 'غير محدد'} icon={<UserRound />} tone="violet" hint={null} />
        <StatCard title="النطاق" value={store.domain || 'غير محدد'} icon={<Globe />} tone="cyan" hint={null} />
      </div>

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
                <StatusPill tone={subscriptionStatus === 'ACTIVE' ? 'green' : 'amber'}>{getStatusText(subscriptionStatus)}</StatusPill>
                <div>
                  <p className="text-sm font-bold text-slate-400">الخطة</p>
                  <p className="text-lg font-black text-violet-700">{store.subscription.plan.name}</p>
                </div>
              </div>
              <InfoItem label="وصف الخطة" value={store.subscription.plan.description} />
              <InfoItem label="تاريخ البدء" value={formatDate(store.subscription.start_at)} />
              <InfoItem label="تاريخ الانتهاء" value={formatDate(store.subscription.end_at)} />
            </>
          ) : (
            <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-400">لا يوجد اشتراك مرتبط بهذا المتجر</p>
          )}
        </DetailsCard>

        <DetailsCard title="الروابط والنطاق">
          <InfoItem label="النطاق" value={store.domain ? `${store.domain}.mel.iq` : 'غير محدد'} />
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
            <SummaryRow label="شركة الشحن" value={store.deliveryCompanyId || 'غير محدد'} />
          </tbody>
        </table>
      </TableShell>
    </div>
  );
};

const DetailsCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
    <h2 className="mb-5 text-xl font-black text-slate-950">{title}</h2>
    <div className="space-y-3">{children}</div>
  </div>
);

const InfoItem = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
    <span className="max-w-[65%] truncate font-bold text-slate-800">{value}</span>
    <span className="flex items-center gap-2 text-sm font-semibold text-slate-400">{label}{icon}</span>
  </div>
);

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <tr className="text-sm text-slate-700 transition hover:bg-slate-50/70">
    <td className="px-5 py-4 font-black text-slate-950">{label}</td>
    <td className="px-5 py-4 font-semibold text-slate-600">{value}</td>
    <td className="px-5 py-4"><StatusPill tone={value === 'غير محدد' ? 'slate' : 'green'}>{value === 'غير محدد' ? 'ناقص' : 'متوفر'}</StatusPill></td>
  </tr>
);

const getPublicAssetUrl = (path?: string | null) => {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
  return `${publicAssetBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
};

const getStoreType = (type?: string | null) => type === 'ECOMMERCE' ? 'متجر إلكتروني' : type || 'غير محدد';

const getStatusText = (status?: string | null) => {
  const statusMap: Record<string, string> = {
    ACTIVE: 'نشط',
    CANCELLED: 'ملغى',
    EXPIRED: 'منتهي',
    PAUSED: 'متوقف',
  };
  return status ? statusMap[status] || status : 'بدون اشتراك';
};

const formatDate = (date: string) => new Date(date).toLocaleDateString('ar-IQ');

export default StoreDetails;
