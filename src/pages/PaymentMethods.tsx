import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CreditCard, Landmark, Pencil, Plus, Trash2, WalletCards } from 'lucide-react';
import {
  AlertMessage,
  ConfirmDeleteModal,
  DrawerFooter,
  EmptyState,
  FormField,
  LoadingState,
  PageHeader,
  Pagination,
  PrimaryActionButton,
  SearchFiltersBar,
  SelectField,
  SideDrawer,
  StatCard,
  StatusPill,
  TableShell,
  TextAreaField,
} from '@/components/dashboard';
import {
  paymentMethodService,
  paymentProviderService,
  type CreatePaymentMethodRequest,
  type CreatePaymentProviderRequest,
  type PaymentMethod,
  type PaymentProvider,
} from '../services';

const defaultMethodForm: CreatePaymentMethodRequest = {
  name: '',
  code: '',
  providerId: '',
  isActive: true,
  sortOrder: 0,
};

const defaultProviderForm: CreatePaymentProviderRequest = {
  name: '',
  code: '',
  description: '',
  logoUrl: '',
  isActive: true,
  type: 'ONLINE',
};

const PaymentMethods = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'methods' | 'providers'>('methods');
  const [search, setSearch] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [editingProvider, setEditingProvider] = useState<PaymentProvider | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'method' | 'provider' } | null>(null);
  const [methodFormData, setMethodFormData] = useState<CreatePaymentMethodRequest>(defaultMethodForm);
  const [providerFormData, setProviderFormData] = useState<CreatePaymentProviderRequest>(defaultProviderForm);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [providersResponse, methodsResponse] = await Promise.all([
        paymentProviderService.getAllPaymentProviders({ page: 1, limit: 100 }),
        paymentMethodService.getAllPaymentMethods({ page: 1, limit: 100 }),
      ]);
      setProviders(providersResponse.data || []);
      setMethods(methodsResponse.data || []);
    } catch (err) {
      setError('فشل في جلب بيانات الدفع. يرجى المحاولة مرة أخرى.');
      console.error('Error fetching payment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const rows = activeTab === 'methods' ? methods.filter((method) => !method.is_deleted) : providers;
  const filteredRows = useMemo(() => rows.filter((item) => {
    const text = activeTab === 'methods'
      ? [item.name, (item as PaymentMethod).code, (item as PaymentMethod).provider?.name].join(' ')
      : [item.name, (item as PaymentProvider).code, (item as PaymentProvider).description].join(' ');
    return text.toLowerCase().includes(search.toLowerCase());
  }), [activeTab, rows, search]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openCreateDrawer = () => {
    setEditingMethod(null);
    setEditingProvider(null);
    setMethodFormData(defaultMethodForm);
    setProviderFormData(defaultProviderForm);
    setShowDrawer(true);
  };

  const openEditMethod = (method: PaymentMethod) => {
    setEditingMethod(method);
    setEditingProvider(null);
    setMethodFormData({
      name: method.name,
      code: method.code,
      providerId: method.providerId,
      isActive: method.isActive ?? true,
      sortOrder: method.sortOrder || 0,
      requirements: method.requirements || null,
    });
    setShowDrawer(true);
  };

  const openEditProvider = (provider: PaymentProvider) => {
    setEditingProvider(provider);
    setEditingMethod(null);
    setProviderFormData({
      name: provider.name,
      code: provider.code,
      description: provider.description || '',
      logoUrl: provider.logoUrl || '',
      isActive: provider.isActive ?? true,
      type: provider.type || 'ONLINE',
    });
    setShowDrawer(true);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setEditingMethod(null);
    setEditingProvider(null);
    setMethodFormData(defaultMethodForm);
    setProviderFormData(defaultProviderForm);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setError('');
      if (activeTab === 'methods') {
        if (editingMethod) await paymentMethodService.updatePaymentMethod(editingMethod.id, methodFormData);
        else await paymentMethodService.createPaymentMethod(methodFormData);
      } else {
        if (editingProvider) await paymentProviderService.updatePaymentProvider(editingProvider.id, providerFormData);
        else await paymentProviderService.createPaymentProvider(providerFormData);
      }
      closeDrawer();
      fetchData();
    } catch (err) {
      setError('فشل في حفظ بيانات الدفع.');
      console.error('Error saving payment data:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setError('');
      if (deleteTarget.type === 'method') await paymentMethodService.deletePaymentMethod(deleteTarget.id);
      else await paymentProviderService.deletePaymentProvider(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError('فشل في حذف العنصر.');
      console.error('Error deleting payment item:', err);
    }
  };

  if (loading && methods.length === 0 && providers.length === 0) return <LoadingState />;

  return (
    <div className="min-h-screen space-y-5 bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="بوابات الدفع"
        description={<>هناك <span className="font-black text-violet-600">{methods.length} طريقة دفع</span> و <span className="font-black text-violet-600">{providers.length} مزود</span></>}
        icon={<CreditCard className="h-6 w-6" />}
        action={<PrimaryActionButton onClick={openCreateDrawer}>إضافة {activeTab === 'methods' ? 'طريقة دفع' : 'مزود دفع'}<Plus className="h-4 w-4" /></PrimaryActionButton>}
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="إجمالي طرق الدفع" value={methods.length} icon={<WalletCards />} tone="blue" />
        <StatCard title="طرق الدفع النشطة" value={methods.filter((method) => method.isActive).length} icon={<CreditCard />} tone="teal" />
        <StatCard title="إجمالي المزودين" value={providers.length} icon={<Landmark />} tone="violet" />
        <StatCard title="المزودين النشطين" value={providers.filter((provider) => provider.isActive).length} icon={<Landmark />} tone="emerald" />
      </div>

      <SearchFiltersBar search={search} onSearchChange={setSearch} placeholder="ابحث في بوابات الدفع" onFilterClick={() => setSearch('')}>
        <div className="flex gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100">
          <button onClick={() => { setActiveTab('methods'); setPage(1); }} className={tabClass(activeTab === 'methods')}>طرق الدفع</button>
          <button onClick={() => { setActiveTab('providers'); setPage(1); }} className={tabClass(activeTab === 'providers')}>مزودو الدفع</button>
        </div>
      </SearchFiltersBar>

      <TableShell
        footer={(
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
          />
        )}
      >
        {visibleRows.length === 0 ? (
          <EmptyState title={activeTab === 'methods' ? 'لا توجد طرق دفع' : 'لا يوجد مزودو دفع'} action={<PrimaryActionButton onClick={openCreateDrawer}>إضافة جديد</PrimaryActionButton>} />
        ) : activeTab === 'methods' ? (
          <MethodsTable rows={visibleRows as PaymentMethod[]} providers={providers} onEdit={openEditMethod} onDelete={(method) => setDeleteTarget({ id: method.id, name: method.name, type: 'method' })} />
        ) : (
          <ProvidersTable rows={visibleRows as PaymentProvider[]} onEdit={openEditProvider} onDelete={(provider) => setDeleteTarget({ id: provider.id, name: provider.name, type: 'provider' })} />
        )}
      </TableShell>

      {showDrawer && (
        <form onSubmit={handleSubmit}>
          <SideDrawer
            title={activeTab === 'methods' ? (editingMethod ? 'تعديل طريقة الدفع' : 'إضافة طريقة دفع') : (editingProvider ? 'تعديل مزود الدفع' : 'إضافة مزود دفع')}
            icon={<CreditCard className="h-6 w-6" />}
            onClose={closeDrawer}
            footer={<DrawerFooter onCancel={closeDrawer} submitLabel="حفظ البيانات" />}
          >
            {activeTab === 'methods' ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormField label="الاسم" value={methodFormData.name} required onChange={(value) => setMethodFormData((current) => ({ ...current, name: value }))} />
                <FormField label="الكود" value={methodFormData.code} required onChange={(value) => setMethodFormData((current) => ({ ...current, code: value }))} />
                <SelectField
                  label="المزود"
                  value={methodFormData.providerId}
                  options={[{ value: '', label: 'اختيار المزود' }, ...providers.map((provider) => ({ value: provider.id, label: provider.name }))]}
                  onChange={(value) => setMethodFormData((current) => ({ ...current, providerId: value }))}
                />
                <FormField label="ترتيب العرض" type="number" value={methodFormData.sortOrder} onChange={(value) => setMethodFormData((current) => ({ ...current, sortOrder: Number(value) }))} />
                <SelectField
                  label="الحالة"
                  value={methodFormData.isActive ? 'active' : 'inactive'}
                  options={[{ value: 'active', label: 'نشط' }, { value: 'inactive', label: 'غير نشط' }]}
                  onChange={(value) => setMethodFormData((current) => ({ ...current, isActive: value === 'active' }))}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormField label="اسم المزود" value={providerFormData.name} required onChange={(value) => setProviderFormData((current) => ({ ...current, name: value }))} />
                <FormField label="الكود" value={providerFormData.code} required onChange={(value) => setProviderFormData((current) => ({ ...current, code: value }))} />
                <FormField label="رابط الشعار" value={providerFormData.logoUrl} onChange={(value) => setProviderFormData((current) => ({ ...current, logoUrl: value }))} />
                <SelectField label="النوع" value={providerFormData.type} options={[{ value: 'ONLINE', label: 'أونلاين' }, { value: 'OFFLINE', label: 'أوفلاين' }]} onChange={(value) => setProviderFormData((current) => ({ ...current, type: value as 'ONLINE' | 'OFFLINE' }))} />
                <SelectField label="الحالة" value={providerFormData.isActive ? 'active' : 'inactive'} options={[{ value: 'active', label: 'نشط' }, { value: 'inactive', label: 'غير نشط' }]} onChange={(value) => setProviderFormData((current) => ({ ...current, isActive: value === 'active' }))} />
                <div className="md:col-span-2">
                  <TextAreaField label="الوصف" value={providerFormData.description} onChange={(value) => setProviderFormData((current) => ({ ...current, description: value }))} />
                </div>
              </div>
            )}
          </SideDrawer>
        </form>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title="هل أنت متأكد من الحذف؟"
          description={`سيتم حذف ${deleteTarget.name} من بوابات الدفع.`}
          confirmLabel="حذف"
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          preview={<div className="rounded-3xl bg-white p-6 shadow-sm"><CreditCard className="mx-auto mb-4 h-12 w-12 text-red-500" /><p className="text-xl font-black text-slate-950">{deleteTarget.name}</p></div>}
        />
      )}
    </div>
  );
};

const MethodsTable = ({ rows, providers, onEdit, onDelete }: { rows: PaymentMethod[]; providers: PaymentProvider[]; onEdit: (method: PaymentMethod) => void; onDelete: (method: PaymentMethod) => void }) => (
  <table className="w-full min-w-[920px]">
    <thead>
      <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
        <th className="px-5 py-5 text-right">طريقة الدفع</th>
        <th className="px-5 py-5 text-right">الكود</th>
        <th className="px-5 py-5 text-right">المزود</th>
        <th className="px-5 py-5 text-right">الترتيب</th>
        <th className="px-5 py-5 text-right">الحالة</th>
        <th className="px-5 py-5 text-right">العمليات</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {rows.map((method, index) => (
        <tr key={method.id} className="text-sm text-slate-700 transition hover:bg-slate-50/70">
          <td className="px-5 py-4 font-black text-slate-950">{method.name}</td>
          <td className="px-5 py-4 font-semibold text-slate-600">{method.code}</td>
          <td className="px-5 py-4 text-slate-600">{method.provider?.name || providers.find((provider) => provider.id === method.providerId)?.name || '-'}</td>
          <td className="px-5 py-4 text-slate-600">{method.sortOrder ?? index + 1}</td>
          <td className="px-5 py-4"><StatusPill tone={method.isActive ? 'green' : 'slate'}>{method.isActive ? 'نشط' : 'غير نشط'}</StatusPill></td>
          <td className="px-5 py-4"><ActionButtons onEdit={() => onEdit(method)} onDelete={() => onDelete(method)} /></td>
        </tr>
      ))}
    </tbody>
  </table>
);

const ProvidersTable = ({ rows, onEdit, onDelete }: { rows: PaymentProvider[]; onEdit: (provider: PaymentProvider) => void; onDelete: (provider: PaymentProvider) => void }) => (
  <table className="w-full min-w-[920px]">
    <thead>
      <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
        <th className="px-5 py-5 text-right">المزود</th>
        <th className="px-5 py-5 text-right">الكود</th>
        <th className="px-5 py-5 text-right">النوع</th>
        <th className="px-5 py-5 text-right">عدد الطرق</th>
        <th className="px-5 py-5 text-right">الحالة</th>
        <th className="px-5 py-5 text-right">العمليات</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {rows.map((provider) => (
        <tr key={provider.id} className="text-sm text-slate-700 transition hover:bg-slate-50/70">
          <td className="px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-violet-600">
                {provider.logoUrl ? <img src={provider.logoUrl} alt="" className="h-8 w-8 object-contain" /> : <Landmark className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-black text-slate-950">{provider.name}</p>
                <p className="text-xs font-semibold text-slate-400">{provider.description || 'مزود دفع'}</p>
              </div>
            </div>
          </td>
          <td className="px-5 py-4 font-semibold text-slate-600">{provider.code}</td>
          <td className="px-5 py-4"><StatusPill tone="blue">{provider.type === 'ONLINE' ? 'أونلاين' : 'أوفلاين'}</StatusPill></td>
          <td className="px-5 py-4 text-slate-600">{provider._count?.methods || 0}</td>
          <td className="px-5 py-4"><StatusPill tone={provider.isActive ? 'green' : 'slate'}>{provider.isActive ? 'نشط' : 'غير نشط'}</StatusPill></td>
          <td className="px-5 py-4"><ActionButtons onEdit={() => onEdit(provider)} onDelete={() => onDelete(provider)} /></td>
        </tr>
      ))}
    </tbody>
  </table>
);

const ActionButtons = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
  <div className="flex items-center gap-3">
    <button onClick={onDelete} className="text-red-400 transition hover:text-red-600" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>
    <button onClick={onEdit} className="text-slate-400 transition hover:text-blue-500" aria-label="تعديل"><Pencil className="h-4 w-4" /></button>
  </div>
);

const tabClass = (active: boolean) => active
  ? 'rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white'
  : 'rounded-xl px-4 py-2 text-sm font-black text-slate-500 hover:bg-slate-50';

export default PaymentMethods;
