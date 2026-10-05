import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, CreditCard, Database, Landmark, Plus, Settings2, XCircle } from 'lucide-react';
import {
  ActionButtons,
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
  StatusToggle,
  TableShell,
  TextAreaField,
} from '@/components/dashboard';
import { GatewayHealthStrip } from '@/components/dashboard/GatewayHealthStrip';
import {
  GatewayDetailPanel,
  GatewaysTable,
} from '@/components/payments/GatewaysTable';
import { gatewayStatus } from '@/lib/gateway-presentation';
import {
  paymentGatewaysService,
  type GatewayActivity,
  type GatewaySurfaceSetting,
  type PaymentGatewayHealth,
  type PaymentSurface,
} from '@/services/paymentGatewaysService';
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

/**
 * The server's own words, when it sent any.
 *
 * Every refusal on this page is one an operator can act on — a provider that
 * cannot be switched on because `QICARD_TERMINAL_ID` is unset, a method whose
 * provider the platform has withdrawn — and the response carries which. One
 * function so the create path and the toggle path cannot come to disagree
 * about whether to show it; they already had, and the create path was the one
 * that threw it away.
 *
 * Axios puts it at `response.data.message`; this project's interceptor
 * sometimes unwraps to `data.message`. Nest sends an array for a validation
 * failure, so that case is joined rather than rendered as `[object Object]`.
 */
const serverMessage = (error: unknown, fallback: string): string => {
  const candidate = error as {
    response?: { data?: { message?: unknown } };
    data?: { message?: unknown };
    message?: unknown;
  };

  const raw =
    candidate?.response?.data?.message ??
    candidate?.data?.message ??
    candidate?.message;

  if (Array.isArray(raw)) {
    const joined = raw.filter((item) => typeof item === 'string').join('، ');
    return joined || fallback;
  }

  return typeof raw === 'string' && raw.trim() ? raw : fallback;
};

const PaymentMethods = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // The page is «بوابات الدفع», so it opens on the gateways.
  const [activeTab, setActiveTab] = useState<'methods' | 'providers'>('providers');
  const [search, setSearch] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [editingProvider, setEditingProvider] = useState<PaymentProvider | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'method' | 'provider' } | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<PaymentProvider | null>(null);
  const [methodFormData, setMethodFormData] = useState<CreatePaymentMethodRequest>(defaultMethodForm);
  const [providerFormData, setProviderFormData] = useState<CreatePaymentProviderRequest>(defaultProviderForm);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activity, setActivity] = useState<Record<string, GatewayActivity>>({});
  const [detailProvider, setDetailProvider] = useState<PaymentProvider | null>(null);
  const [probed, setProbed] = useState<PaymentGatewayHealth | null>(null);
  const [probing, setProbing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [gatewaySettings, setGatewaySettings] = useState<GatewaySurfaceSetting[]>([]);
  const [savingSurface, setSavingSurface] = useState<PaymentSurface | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      /**
       * Activity reads the ledgers and contacts no gateway, so it is safe on
       * page load — unlike the probe behind «اختبار الاتصال», which is a real
       * round trip to someone else's payment system and stays a button.
       *
       * `catch` rather than `Promise.all`: a deployment whose server predates
       * this route should still get its gateways list, with the activity
       * columns reading «—» rather than the whole page failing.
       */
      const [providersResponse, methodsResponse, activityResponse, settingsResponse] = await Promise.all([
        paymentProviderService.getAllPaymentProviders({ page: 1, limit: 100 }),
        paymentMethodService.getAllPaymentMethods({ page: 1, limit: 100 }),
        paymentGatewaysService.getActivity().catch(() => ({ data: [] })),
        paymentGatewaysService.getSettings().catch(() => ({ data: [] })),
      ]);
      setProviders(providersResponse.data || []);
      setMethods(methodsResponse.data || []);
      setActivity(
        Object.fromEntries(
          (activityResponse.data || []).map((entry) => [entry.gateway, entry]),
        ),
      );
      setGatewaySettings(settingsResponse.data || []);
    } catch (err) {
      setError('فشل في جلب بيانات الدفع. يرجى المحاولة مرة أخرى.');
      console.error('Error fetching payment data:', err);
    } finally {
      setLoading(false);
    }
  };

  /** One pass over one population, so the four cards add up to the total. */
  const gatewayCounts = useMemo(() => {
    const counts = { active: 0, disabled: 0, needsSetup: 0 };
    for (const provider of providers) {
      const { status } = gatewayStatus(provider);
      if (status === 'active') counts.active += 1;
      else if (status === 'disabled') counts.disabled += 1;
      else counts.needsSetup += 1;
    }
    return counts;
  }, [providers]);

  const rows =
    activeTab === 'methods'
      ? methods.filter((method) => !method.is_deleted)
      : providers.filter(
          (provider) =>
            !statusFilter || gatewayStatus(provider).status === statusFilter,
        );
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
      /**
       * The same extraction `toggleProvider` does, for the same reason.
       *
       * Creating a provider is gated on its gateway being configured, exactly
       * as switching one on is — `create` defaults `isActive` to true, so it
       * was the door beside the guarded one. The server names the missing
       * environment variables in its refusal; a generic "something went
       * wrong" here would send the operator to the logs for an answer the
       * response already carried, and the drawer would look simply broken.
       */
      setError(serverMessage(err, 'فشل في حفظ بيانات الدفع.'));
      console.error('Error saving payment data:', err);
    }
  };

  /**
   * The platform's switch, and it reaches further than this page.
   *
   * Deactivating a provider withdraws every method under it: the storefront
   * stops listing them, checkout refuses an order that names one, the pay
   * button refuses to open a gateway, and the merchant dashboard will not let
   * a shop switch one back on. That is a lot to happen behind one tap, so a
   * provider going *off* asks first; turning one back on does not, because
   * restoring something is not the dangerous direction.
   */
  const toggleProvider = async (provider: PaymentProvider) => {
    try {
      setError('');
      await paymentProviderService.updatePaymentProvider(provider.id, {
        isActive: !provider.isActive,
      });
      setDeactivateTarget(null);
      fetchData();
    } catch (err) {
      /**
       * The server refuses an activation it cannot honour and says exactly
       * which environment variables are missing. Swallowing that for a
       * generic "something went wrong" would send the operator to the logs
       * for an answer the response already carried.
       */
      setError(serverMessage(err, 'تعذر تغيير حالة المزود.'));
      console.error('Error toggling payment provider:', err);
    }
  };

  const toggleMethod = async (method: PaymentMethod) => {
    try {
      setError('');
      await paymentMethodService.updatePaymentMethod(method.id, {
        isActive: !method.isActive,
      });
      fetchData();
    } catch (err) {
      setError('تعذر تغيير حالة طريقة الدفع.');
      console.error('Error toggling payment method:', err);
    }
  };

  const openDetail = (provider: PaymentProvider) => {
    setDetailProvider(provider);
    // A previous gateway's probe must not be read as this one's.
    setProbed(null);
  };

  /**
   * A real round trip, and the only thing on this page that makes one.
   *
   * The list is drawn from configuration alone, so opening the page cannot
   * fire a request at someone else's production payment system once per
   * gateway. That is why this is a button.
   */
  const probeGateway = async () => {
    const gateway = detailProvider?.gateway?.gateway;
    if (!gateway) return;
    try {
      setProbing(true);
      setError('');
      setProbed(await paymentGatewaysService.checkGateway(gateway));
    } catch (err) {
      setError(serverMessage(err, 'تعذر فحص الاتصال بالبوابة.'));
      console.error('Error probing gateway:', err);
    } finally {
      setProbing(false);
    }
  };

  /**
   * Switch one gateway on or off for one surface.
   *
   * Optimistic, then reconciled from the server's answer: the control is a
   * toggle and a toggle that waits a round trip before moving feels broken.
   * A refusal puts it back and shows the server's reason rather than a
   * generic failure.
   */
  const setSurfaceEnabled = async (
    surface: PaymentSurface,
    enabled: boolean,
  ) => {
    const gateway = detailProvider?.gateway?.gateway;
    if (!gateway) return;

    const previous = gatewaySettings;
    const optimistic: GatewaySurfaceSetting = {
      gateway,
      surface,
      enabled,
      updatedAt: new Date().toISOString(),
    };

    setSavingSurface(surface);
    setGatewaySettings((current) => [
      ...current.filter(
        (entry) => !(entry.gateway === gateway && entry.surface === surface),
      ),
      optimistic,
    ]);

    try {
      setError('');
      const saved = await paymentGatewaysService.setSurfaceEnabled(
        gateway,
        surface,
        enabled,
      );
      setGatewaySettings((current) => [
        ...current.filter(
          (entry) => !(entry.gateway === gateway && entry.surface === surface),
        ),
        saved,
      ]);
    } catch (err) {
      setGatewaySettings(previous);
      setError(serverMessage(err, 'تعذر تغيير إعداد البوابة.'));
      console.error('Error updating gateway setting:', err);
    } finally {
      setSavingSurface(null);
    }
  };

  /** The two surfaces for one gateway, keyed so the drawer can read either. */
  const settingsFor = (gateway?: string) =>
    Object.fromEntries(
      gatewaySettings
        .filter((entry) => entry.gateway === gateway)
        .map((entry) => [entry.surface, entry]),
    ) as Partial<Record<PaymentSurface, GatewaySurfaceSetting>>;

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
    <div className="page-shell bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="بوابات الدفع"
        /*
          The page is «بوابات الدفع» and opens on the gateways, so the line
          under the title counts gateways. It read «هناك 0 طريقة دفع و 4 مزود»
          — leftover from when this was a methods-first page, and it led with
          a zero that was true and irrelevant.
        */
        description={
          <>
            <span className="font-black text-violet-600">{providers.length} بوابة</span>
            {gatewayCounts.needsSetup > 0 ? (
              <>
                {' — '}
                <span className="font-black text-amber-600">
                  {gatewayCounts.needsSetup} تحتاج إعداد
                </span>
              </>
            ) : (
              <>
                {' — '}
                <span className="font-black text-emerald-600">
                  {gatewayCounts.active} مفعلة
                </span>
              </>
            )}
          </>
        }
        icon={<CreditCard className="h-6 w-6" />}
        action={<PrimaryActionButton onClick={openCreateDrawer}>إضافة {activeTab === 'methods' ? 'طريقة دفع' : 'مزود دفع'}<Plus className="h-4 w-4" /></PrimaryActionButton>}
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      {/*
        The four states a gateway can be in, and they sum to the total.

        The set this replaces counted methods and providers side by side —
        four numbers from two different populations, so they did not add up to
        anything and «المزودين النشطين» could not be checked against
        «إجمالي المزودين» by eye. «تحتاج إعداد» is the one worth drawing: a
        provider the platform is offering while the integration behind it has
        no credentials, which otherwise looks identical to a working one until
        a shopper reaches the gateway.
      */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard title="إجمالي البوابات" value={providers.length} icon={<Database />} tone="blue" />
        <StatCard title="مفعلة" value={gatewayCounts.active} icon={<CheckCircle2 />} tone="emerald" />
        <StatCard title="معطلة" value={gatewayCounts.disabled} icon={<XCircle />} tone="slate" />
        <StatCard title="تحتاج إعداد" value={gatewayCounts.needsSetup} icon={<Settings2 />} tone="amber" />
      </div>

      <GatewayHealthStrip />

      <SearchFiltersBar search={search} onSearchChange={setSearch} placeholder="ابحث عن بوابة دفع..." onFilterClick={() => setSearch('')}>
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'providers' && (
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="h-11 rounded-2xl bg-white px-4 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-100 outline-none"
            >
              <option value="">جميع الحالات</option>
              <option value="active">مفعلة</option>
              <option value="disabled">معطلة</option>
              <option value="needs-setup">تحتاج إعداد</option>
            </select>
          )}
          <div className="flex gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100">
            <button onClick={() => { setActiveTab('providers'); setPage(1); }} className={tabClass(activeTab === 'providers')}>البوابات</button>
            <button onClick={() => { setActiveTab('methods'); setPage(1); }} className={tabClass(activeTab === 'methods')}>طرق الدفع</button>
          </div>
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
          <MethodsTable rows={visibleRows as PaymentMethod[]} providers={providers} onEdit={openEditMethod} onDelete={(method) => setDeleteTarget({ id: method.id, name: method.name, type: 'method' })} onToggle={toggleMethod} />
        ) : (
          <GatewaysTable
            rows={visibleRows as PaymentProvider[]}
            activityByGateway={activity}
            actions={{
              onOpen: openDetail,
              onEdit: openEditProvider,
              onDelete: (provider) =>
                setDeleteTarget({ id: provider.id, name: provider.name, type: 'provider' }),
              onToggle: (provider) =>
                provider.isActive ? setDeactivateTarget(provider) : toggleProvider(provider),
            }}
          />
        )}
      </TableShell>

      {detailProvider && (
        <SideDrawer
          title="تفاصيل بوابة الدفع"
          subtitle={detailProvider.name}
          icon={<CreditCard className="h-5 w-5" />}
          onClose={() => setDetailProvider(null)}
        >
          <GatewayDetailPanel
            provider={detailProvider}
            activity={
              detailProvider.gateway
                ? activity[detailProvider.gateway.gateway]
                : null
            }
            settings={settingsFor(detailProvider.gateway?.gateway)}
            savingSurface={savingSurface}
            onSurfaceToggle={setSurfaceEnabled}
            probing={probing}
            probed={probed}
            onProbe={probeGateway}
            onToggle={() => {
              if (detailProvider.isActive) setDeactivateTarget(detailProvider);
              else toggleProvider(detailProvider);
              setDetailProvider(null);
            }}
          />
        </SideDrawer>
      )}

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
                <FormField label="الاسم" value={methodFormData.name} placeholder="مثل: Qi أو زين كاش" required onChange={(value) => setMethodFormData((current) => ({ ...current, name: value }))} />
                <FormField label="الكود" value={methodFormData.code} placeholder="مثل: qi أو zaincash" required onChange={(value) => setMethodFormData((current) => ({ ...current, code: value }))} />
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
                <FormField label="اسم المزود" value={providerFormData.name} placeholder="مثل: Qi أو ZainCash" required onChange={(value) => setProviderFormData((current) => ({ ...current, name: value }))} />
                <FormField label="الكود" value={providerFormData.code} placeholder="مثل: qiservice أو zaincash" required onChange={(value) => setProviderFormData((current) => ({ ...current, code: value }))} />
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

      {deactivateTarget && (
        <ConfirmDeleteModal
          title="إيقاف مزود الدفع؟"
          description={`سيتم إيقاف جميع طرق الدفع التابعة لـ "${deactivateTarget.name}" في كل المتاجر: لن تظهر للمشتري عند الدفع، ولن يتمكن أصحاب المتاجر من تفعيلها حتى تُعيد تفعيل المزود. الطلبات المدفوعة مسبقاً لا تتأثر.`}
          confirmLabel="إيقاف المزود"
          onClose={() => setDeactivateTarget(null)}
          onConfirm={() => toggleProvider(deactivateTarget)}
          preview={
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <Landmark className="mx-auto mb-4 h-12 w-12 text-orange-500" />
              <p className="text-xl font-black text-slate-950">{deactivateTarget.name}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {deactivateTarget._count?.methods ?? 0} طريقة دفع ستتوقف
              </p>
            </div>
          }
        />
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

/**
 * The same control `Employees.tsx` uses, so an operator meets one idiom for
 * "this row is on" across the dashboard.
 */
const providerOf = (method: PaymentMethod, providers: PaymentProvider[]) =>
  method.provider ?? providers.find((p) => p.id === method.providerId);

const MethodsTable = ({ rows, providers, onEdit, onDelete, onToggle }: { rows: PaymentMethod[]; providers: PaymentProvider[]; onEdit: (method: PaymentMethod) => void; onDelete: (method: PaymentMethod) => void; onToggle: (method: PaymentMethod) => void }) => (
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
          <td className="px-5 py-4">
            {providerOf(method, providers)?.isActive === false ? (
              // A method under a withdrawn provider cannot be offered whatever
              // its own flag says, so showing an "on" toggle here would be a
              // lie the merchant and the shopper both see through.
              <StatusPill tone="slate">موقوف مع المزود</StatusPill>
            ) : (
              <StatusToggle active={!!method.isActive} onClick={() => onToggle(method)} />
            )}
          </td>
          <td className="px-5 py-4"><ActionButtons onEdit={() => onEdit(method)} onDelete={() => onDelete(method)} subject={method.name} /></td>
        </tr>
      ))}
    </tbody>
  </table>
);


const tabClass = (active: boolean) => active
  ? 'rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white'
  : 'rounded-xl px-4 py-2 text-sm font-black text-slate-500 hover:bg-slate-50';

export default PaymentMethods;
