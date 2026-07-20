import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Building2, ExternalLink, Mail, MapPin, PackageCheck, Phone, Plus, Star, Truck, Trash2 } from 'lucide-react';
import {
  ConfirmDeleteModal,
  DrawerFooter,
  FormField,
  PageHeader,
  PrimaryActionButton,
  SearchFiltersBar,
  SelectField,
  SideDrawer,
  StatCard,
  StatusPill,
  AlertMessage,
  LoadingState,
} from '@/components/dashboard';
import { deliveryCompanyService, type DeliveryCompany, type DeliveryCompanyPayload, type DeliveryCompanyStatus } from '../services/deliveryCompanyService';

const defaultForm: DeliveryCompanyPayload = {
  name: '',
  code: '',
  description: '',
  logo: '',
  website: '',
  contact: '',
  email: '',
  phone: '',
  address: '',
  zip: '',
  status: 'ACTIVE',
  rating: 0,
};

const DeliveryCompanies = () => {
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryCompanyStatus | ''>('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingCompany, setEditingCompany] = useState<DeliveryCompany | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<DeliveryCompany | null>(null);
  const [formData, setFormData] = useState(defaultForm);

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await deliveryCompanyService.getSystemDeliveryCompanies({
        page: 1,
        limit: 100,
        search,
        status: statusFilter,
      });
      setCompanies(response.data || []);
    } catch (err) {
      setError('فشل في جلب شركات الشحن. يرجى المحاولة مرة أخرى.');
      console.error('Error fetching delivery companies:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const filteredCompanies = useMemo(() => companies.filter((company) => {
    const matchesSearch = [company.name, company.contact, company.email, company.phone].join(' ').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || company.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [companies, search, statusFilter]);

  const openCreateDrawer = () => {
    setEditingCompany(null);
    setFormData(defaultForm);
    setShowDrawer(true);
  };

  const openEditDrawer = (company: DeliveryCompany) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      code: company.code || '',
      description: company.description || '',
      logo: company.logo || '',
      website: company.website || '',
      contact: company.contact || '',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      zip: company.zip || '',
      status: company.status,
      rating: company.rating || 0,
    });
    setShowDrawer(true);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setEditingCompany(null);
    setFormData(defaultForm);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setError('');
      if (editingCompany) {
        await deliveryCompanyService.updateDeliveryCompany(editingCompany.id, formData);
      } else {
        await deliveryCompanyService.createDeliveryCompany(formData);
      }
      closeDrawer();
      fetchCompanies();
    } catch (err) {
      setError(editingCompany ? 'فشل في تحديث شركة الشحن.' : 'فشل في إنشاء شركة الشحن.');
      console.error('Error saving delivery company:', err);
    }
  };

  const handleDelete = async () => {
    if (!companyToDelete) return;
    try {
      setError('');
      await deliveryCompanyService.deleteDeliveryCompany(companyToDelete.id);
      setCompanyToDelete(null);
      fetchCompanies();
    } catch (err) {
      setError('فشل في حذف شركة الشحن.');
      console.error('Error deleting delivery company:', err);
    }
  };

  if (loading && companies.length === 0) return <LoadingState />;

  return (
    <div className="min-h-screen space-y-5 bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="شركات الشحن"
        description={<>هناك <span className="font-black text-violet-600">{companies.length} شركة</span> في قائمة الشحن</>}
        icon={<Truck className="h-6 w-6" />}
        action={<PrimaryActionButton onClick={openCreateDrawer}>إضافة شركة<Plus className="h-4 w-4" /></PrimaryActionButton>}
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="إجمالي الشركات" value={companies.length} icon={<Building2 />} tone="blue" />
        <StatCard title="الشركات النشطة" value={companies.filter((company) => company.status === 'ACTIVE').length} icon={<PackageCheck />} tone="teal" />
        <StatCard title="طلبات هذا الشهر" value={companies.reduce((sum, company) => sum + (company.monthlyOrders || 0), 0)} icon={<Truck />} tone="amber" />
      </div>

      <SearchFiltersBar
        search={search}
        onSearchChange={setSearch}
        placeholder="ابحث عن شركات الشحن"
        filterCount={statusFilter ? 1 : 0}
        onFilterClick={() => setStatusFilter('')}
      >
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as DeliveryCompanyStatus | '')}
          className="h-12 rounded-2xl border border-slate-100 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm outline-none"
        >
          <option value="">كل الحالات</option>
          <option value="ACTIVE">نشطة</option>
          <option value="INACTIVE">غير نشطة</option>
        </select>
      </SearchFiltersBar>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredCompanies.map((company) => (
          <div key={company.id} className="rounded-[1.7rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-5 flex items-start justify-between">
              <StatusPill tone={company.status === 'ACTIVE' ? 'green' : 'slate'}>{getStatusText(company.status)}</StatusPill>
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-950">{company.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-400">{company.description || company.code || 'شركة شحن وتوصيل'}</p>
                </div>
                <CompanyLogo company={company} />
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <InfoRow icon={<Mail className="h-4 w-4" />} label="البريد" value={company.email || company.contact || '-'} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="الهاتف" value={company.phone || '-'} />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="العنوان" value={company.address || '-'} />
              <InfoRow icon={<ExternalLink className="h-4 w-4" />} label="الموقع" value={company.website || '-'} />
              <InfoRow icon={<Star className="h-4 w-4" />} label="التقييم" value={company.rating ? `${company.rating}/5` : '-'} />
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">المتاجر المرتبطة</span>
                  <span className="font-black text-slate-900">{company.storesCount || 0}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-slate-400">الطلبات الشهرية</span>
                  <span className="font-black text-slate-900">{company.monthlyOrders || 0}</span>
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setCompanyToDelete(company)} className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-500"><Trash2 className="h-4 w-4" /></button>
              <button onClick={() => openEditDrawer(company)} className="flex-1 rounded-xl bg-slate-50 py-2 text-sm font-black text-slate-600">تعديل</button>
              <button className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-black text-white">عرض التفاصيل</button>
            </div>
          </div>
        ))}
      </div>

      {showDrawer && (
        <form onSubmit={handleSubmit}>
          <SideDrawer
            title={editingCompany ? 'تعديل شركة الشحن' : 'إضافة شركة شحن'}
            icon={<Truck className="h-6 w-6" />}
            onClose={closeDrawer}
            footer={<DrawerFooter onCancel={closeDrawer} submitLabel={editingCompany ? 'حفظ التغييرات' : 'إضافة الشركة'} />}
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField label="اسم الشركة" value={formData.name} required onChange={(value) => setFormData((current) => ({ ...current, name: value }))} />
              <FormField label="الكود" value={formData.code} onChange={(value) => setFormData((current) => ({ ...current, code: value }))} />
              <FormField label="جهة الاتصال" value={formData.contact} onChange={(value) => setFormData((current) => ({ ...current, contact: value }))} />
              <FormField label="البريد الإلكتروني" value={formData.email} required onChange={(value) => setFormData((current) => ({ ...current, email: value }))} />
              <FormField label="رقم الهاتف" value={formData.phone} onChange={(value) => setFormData((current) => ({ ...current, phone: value }))} />
              <FormField label="رابط الشعار" value={formData.logo} onChange={(value) => setFormData((current) => ({ ...current, logo: value }))} />
              <FormField label="الموقع الإلكتروني" value={formData.website} onChange={(value) => setFormData((current) => ({ ...current, website: value }))} />
              <FormField label="العنوان" value={formData.address} onChange={(value) => setFormData((current) => ({ ...current, address: value }))} />
              <FormField label="الرمز البريدي" value={formData.zip} onChange={(value) => setFormData((current) => ({ ...current, zip: value }))} />
              <FormField label="التقييم" type="number" value={formData.rating} onChange={(value) => setFormData((current) => ({ ...current, rating: Number(value) }))} />
              <SelectField
                label="الحالة"
                value={formData.status}
                options={[{ value: 'ACTIVE', label: 'نشطة' }, { value: 'INACTIVE', label: 'غير نشطة' }]}
                onChange={(value) => setFormData((current) => ({ ...current, status: value as DeliveryCompanyStatus }))}
              />
            </div>
          </SideDrawer>
        </form>
      )}

      {companyToDelete && (
        <ConfirmDeleteModal
          title="هل أنت متأكد من حذف شركة الشحن؟"
          description={`سيتم حذف ${companyToDelete.name} من قائمة شركات الشحن.`}
          confirmLabel="حذف الشركة"
          onClose={() => setCompanyToDelete(null)}
          onConfirm={handleDelete}
          preview={<div className="rounded-3xl bg-white p-6 shadow-sm"><Truck className="mx-auto mb-4 h-12 w-12 text-red-500" /><p className="text-xl font-black text-slate-950">{companyToDelete.name}</p></div>}
        />
      )}
    </div>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center justify-between rounded-2xl bg-white">
    <span className="max-w-[60%] truncate font-bold text-slate-800" dir="ltr">{value}</span>
    <span className="flex items-center gap-2 text-slate-400">{label}{icon}</span>
  </div>
);

const CompanyLogo = ({ company }: { company: DeliveryCompany }) => (
  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-violet-50 text-violet-600">
    {company.logo ? (
      <img src={company.logo} alt={company.name} className="h-full w-full object-cover" />
    ) : (
      <Truck className="h-6 w-6" />
    )}
  </div>
);

const getStatusText = (status: DeliveryCompanyStatus) => status === 'ACTIVE' ? 'نشطة' : 'غير نشطة';

export default DeliveryCompanies;
