import { useCallback, useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ChevronDown,
  CirclePlus,
  Grid2X2,
  ImagePlus,
  List,
  Pencil,
  Plus,
  Search,
  Store as StoreIcon,
  Trash2,
} from 'lucide-react';
import {
  AlertMessage,
  DrawerFooter,
  EmptyState,
  FormField,
  LoadingState,
  PageHeader,
  Pagination,
  PrimaryActionButton,
  SelectField,
  SideDrawer,
  StatCard,
  StatusPill,
  TableShell,
} from '@/components/dashboard';
import { cn } from '@/lib/utils';
import { systemStoresService, type CreateStoreRequest, type Store } from '../services/systemStoresService';

type ViewMode = 'table' | 'cards';
type StoreRating = 'ضعيف' | 'متوسط' | 'ممتاز';

type FiltersState = {
  status: 'all' | 'active' | 'inactive';
  subscriptionType: 'all' | 'basic' | 'premium';
  subscriptionDuration: 'all' | 'monthly' | 'yearly';
  rating: 'all' | StoreRating;
  addedBy: 'all' | 'owner' | 'manager';
};

type StoreFormState = CreateStoreRequest & {
  phone: string;
  storeType: string;
  subscriptionType: 'basic' | 'premium';
  subscriptionDuration: 'monthly' | 'yearly' | '';
  imagePreview: string;
};

type StoreRow = {
  id: string;
  name: string;
  owner: string;
  planText: string;
  planKey: 'basic' | 'premium';
  statusKey: 'active' | 'inactive';
  endDate: string;
  rating: StoreRating;
  logo: string | null;
  accent: string;
};

const subscriptionOptions = [
  { value: 'basic', label: 'الاشتراك العادي' },
  { value: 'premium', label: 'الاشتراك الاحترافي' },
];

const durationOptions = [
  { value: 'monthly', label: 'شهري' },
  { value: 'yearly', label: 'سنوي' },
];

const storeTypeOptions = [
  'متجر منتجات الكترونية',
  'متجر ملابس',
  'متجر خدمات',
  'مطعم وكافيه',
];

const defaultFormData: StoreFormState = {
  name: '',
  owner: '',
  ownerEmail: '',
  subscriptionPlanId: '',
  status: 'active',
  phone: '',
  storeType: storeTypeOptions[0],
  subscriptionType: 'basic',
  subscriptionDuration: '',
  imagePreview: '',
};

const defaultFilters: FiltersState = {
  status: 'all',
  subscriptionType: 'all',
  subscriptionDuration: 'all',
  rating: 'all',
  addedBy: 'all',
};

const accentClasses: Record<string, string> = {
  blue: 'bg-sky-50 text-sky-600',
  green: 'bg-emerald-50 text-emerald-500',
  orange: 'bg-orange-50 text-orange-500',
  pink: 'bg-pink-50 text-pink-500',
  gray: 'bg-slate-50 text-slate-800',
};

const publicAssetBaseUrl = import.meta.env.VITE_PUBLIC_URL || 'https://pub-fe6c304a027a4a3b9e3efb4fd3520dcf.r2.dev/';

const getPublicAssetUrl = (path?: string | null) => {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
  return `${publicAssetBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
};

const getStoreStatusKey = (store: Store): 'active' | 'inactive' => (
  store.subscription?.status === 'ACTIVE' ? 'active' : 'inactive'
);

const getStoreTypeText = (storeType: string | null | undefined) => {
  if (!storeType) return storeTypeOptions[0];
  return storeType === 'ECOMMERCE' ? 'متجر منتجات الكترونية' : storeType;
};

const getStoreDisplay = (store: Store, index: number): StoreRow => {
  const statusKey = getStoreStatusKey(store);
  const planName = store.subscription?.plan.name || 'الاشتراك العادي';
  const planKey = planName.toLowerCase().includes('pro') || planName.toLowerCase().includes('premium') ? 'premium' : 'basic';
  const ratings: StoreRating[] = ['ضعيف', 'متوسط', 'ممتاز', 'متوسط'];

  return {
    id: store.id,
    name: store.name,
    owner: store.owner?.name || store.name,
    planText: planKey === 'premium' ? 'الاشتراك الاحترافي' : 'الاشتراك العادي',
    planKey,
    statusKey,
    endDate: store.subscription?.end_at
      ? new Date(store.subscription.end_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
      : 'Dec 17, 2026',
    rating: ratings[index % ratings.length],
    logo: store.logo,
    accent: ['pink', 'gray', 'green', 'orange', 'blue'][index % 5],
  };
};

const Stores = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [formData, setFormData] = useState<StoreFormState>(defaultFormData);
  const [submitted, setSubmitted] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchStores = useCallback(async (nextPage: number, limit: number) => {
    try {
      setLoading(true);
      setError('');
      const response = await systemStoresService.getAllStores({ page: nextPage, limit });
      setStores(response.data || []);
      setPage(response.page ?? nextPage);
      setPageSize(response.limit ?? limit);
      setTotal(response.total ?? response.data?.length ?? 0);
    } catch (err) {
      setError('فشل في جلب المتاجر. يرجى المحاولة مرة أخرى.');
      console.error('Error fetching stores:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores(page, pageSize);
  }, [fetchStores, page, pageSize]);

  const resetForm = () => {
    setFormData(defaultFormData);
    setSubmitted(false);
  };

  const closeDrawer = () => {
    setShowModal(false);
    setEditingStore(null);
    resetForm();
  };

  const openCreateModal = () => {
    setEditingStore(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (store: Store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      owner: store.owner?.name || '',
      ownerEmail: store.owner?.email || store.email || '',
      subscriptionPlanId: store.subscription?.plan.id || '',
      status: store.subscription?.status === 'CANCELLED' || store.subscription?.status === 'EXPIRED' ? 'inactive' : 'active',
      phone: store.phone || store.owner?.phone || '',
      storeType: getStoreTypeText(store.store_type),
      subscriptionType: store.subscription?.plan.name?.toLowerCase().includes('pro') || store.subscription?.plan.name?.toLowerCase().includes('premium') ? 'premium' : 'basic',
      subscriptionDuration: 'monthly',
      imagePreview: store.logo || '',
    });
    setSubmitted(false);
    setShowModal(true);
  };

  const toApiPayload = (data: StoreFormState): CreateStoreRequest => ({
    name: data.name,
    owner: data.owner,
    ownerEmail: data.ownerEmail,
    subscriptionPlanId: data.subscriptionPlanId || data.subscriptionType,
    status: data.status,
  });

  const isFormValid = Boolean(formData.name && formData.owner && formData.subscriptionDuration && formData.imagePreview);

  const handleCreateStore = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!isFormValid) return;

    try {
      setError('');
      await systemStoresService.createStore(toApiPayload(formData));
      closeDrawer();
      fetchStores(page, pageSize);
    } catch (err) {
      setError('فشل في إنشاء المتجر. يرجى المحاولة مرة أخرى.');
      console.error('Error creating store:', err);
    }
  };

  const handleUpdateStore = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingStore) return;
    setSubmitted(true);
    if (!isFormValid) return;

    try {
      setError('');
      await systemStoresService.updateStore(editingStore.id, toApiPayload(formData));
      closeDrawer();
      fetchStores(page, pageSize);
    } catch (err) {
      setError('فشل في تحديث المتجر. يرجى المحاولة مرة أخرى.');
      console.error('Error updating store:', err);
    }
  };

  const handleDeleteStore = async () => {
    if (!storeToDelete || deleteConfirmation !== storeToDelete.name) return;

    try {
      setError('');
      await systemStoresService.deleteStore(storeToDelete.id);
      setStoreToDelete(null);
      setDeleteConfirmation('');
      fetchStores(page, pageSize);
    } catch (err) {
      setError('فشل في حذف المتجر. يرجى المحاولة مرة أخرى.');
      console.error('Error deleting store:', err);
    }
  };

  const visibleStores = useMemo(() => stores.filter((store, index) => {
    const row = getStoreDisplay(store, index);
    const matchesSearch = [row.name, row.owner, row.planText]
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase());
    const matchesStatus = filters.status === 'all' || row.statusKey === filters.status;
    const matchesPlan = filters.subscriptionType === 'all' || row.planKey === filters.subscriptionType;
    const matchesRating = filters.rating === 'all' || row.rating === filters.rating;
    return matchesSearch && matchesStatus && matchesPlan && matchesRating;
  }), [stores, searchTerm, filters]);

  const stats = useMemo(() => {
    const active = stores.filter((store) => getStoreStatusKey(store) === 'active').length;
    const inactive = stores.filter((store) => getStoreStatusKey(store) === 'inactive').length;
    return [
      { title: 'أجمالي المتاجر', value: total || stores.length, icon: <StoreIcon />, tone: 'blue' as const },
      { title: 'المتاجر الجديدة', value: Math.max(0, Math.round((total || stores.length) * 0.1)), icon: <CirclePlus />, tone: 'teal' as const },
      { title: 'المتاجر النشطة', value: active, icon: <StoreIcon />, tone: 'amber' as const },
      { title: 'الاشتراكات المنتهية', value: inactive, icon: <CalendarDays />, tone: 'rose' as const },
    ];
  }, [stores, total]);

  const filterCount = Object.values(filters).filter((value) => value !== 'all').length;
  const totalPages = Math.max(1, Math.ceil((total || visibleStores.length || 1) / pageSize));
  const listTitle = searchTerm || filterCount > 0 ? 'نتائج البحث والفلاتر' : 'جميع المتاجر';

  const handleImageChange = (file: File | undefined) => {
    if (!file) return;
    setFormData((current) => ({
      ...current,
      imagePreview: URL.createObjectURL(file),
    }));
  };

  if (loading && stores.length === 0) return <LoadingState />;

  return (
    <div className="min-h-screen space-y-5 bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="إدارة المتاجر"
        description={<>هناك <span className="font-black text-violet-600">{total || visibleStores.length}</span> متجر في قائمة المتاجر</>}
        icon={<StoreIcon className="h-6 w-6" />}
        action={(
          <PrimaryActionButton onClick={openCreateModal}>
            اضافة متجر جديد
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20">
              <Plus className="h-4 w-4" />
            </span>
          </PrimaryActionButton>
        )}
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} tone={stat.tone} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-slate-900">{listTitle}</h2>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn('view-button', viewMode === 'table' && 'view-button-active')}
            >
              جدول
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={cn('view-button', viewMode === 'cards' && 'view-button-active')}
            >
              بطاقات
              <Grid2X2 className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className={cn(
              'view-button relative',
              filterCount > 0 && 'border-violet-300 bg-violet-600 text-white'
            )}
          >
            الفلاتر
            {filterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                +{filterCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100">
            <button type="button" className="h-10 rounded-xl bg-cyan-50 px-5 text-sm font-bold text-cyan-500">
              البحث
            </button>
            <div className="relative min-w-[220px]">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ابحث عن المتاجر"
                className="h-10 w-full rounded-xl border-0 bg-transparent pr-9 pl-3 text-sm font-semibold outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <TableShell
          footer={(
            <Pagination
              page={page}
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
          {visibleStores.length === 0 ? (
            <EmptyState
              title="لا يوجد متاجر"
              action={<PrimaryActionButton onClick={openCreateModal}>اضافة متجر جديد</PrimaryActionButton>}
            />
          ) : (
            <table className="w-full min-w-[960px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
                  <th className="px-5 py-5 text-right">الصورة</th>
                  <th className="px-5 py-5 text-right">اسم المتجر</th>
                  <th className="px-5 py-5 text-right">المالك</th>
                  <th className="px-5 py-5 text-right">الحالة</th>
                  <th className="px-5 py-5 text-right">نوع الاشتراك</th>
                  <th className="px-5 py-5 text-right">تاريخ انتهاء الاشتراك</th>
                  <th className="px-5 py-5 text-right">تقييم المتجر</th>
                  <th className="px-5 py-5 text-right">العمليات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleStores.map((store, index) => {
                  const row = getStoreDisplay(store, index);
                  return (
                    <tr key={store.id} className="text-sm text-slate-700 transition hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                          <BrandMark logo={row.logo} accent={row.accent} />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/stores/${store.id}`)}
                          className="font-black text-slate-950"
                        >
                          {row.name}
                        </button>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-600">{row.owner}</td>
                      <td className="px-5 py-4">
                        <StatusPill tone={row.statusKey === 'active' ? 'green' : 'red'}>
                          {row.statusKey === 'active' ? 'نشط' : 'غير نشط'}
                        </StatusPill>
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill tone={row.planKey === 'premium' ? 'blue' : 'violet'}>{row.planText}</StatusPill>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{row.endDate}</td>
                      <td className="px-5 py-4"><RatingText rating={row.rating} /></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setStoreToDelete(store)} className="text-red-400 transition hover:text-red-600" aria-label="حذف">
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => openEditModal(store)} className="text-slate-400 transition hover:text-blue-500" aria-label="تعديل">
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </TableShell>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visibleStores.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="لا يوجد متاجر"
                action={<PrimaryActionButton onClick={openCreateModal}>اضافة متجر جديد</PrimaryActionButton>}
              />
            </div>
          ) : (
            visibleStores.map((store, index) => {
              const row = getStoreDisplay(store, index);
              return (
                <StoreCard
                  key={store.id}
                  row={row}
                  onView={() => navigate(`/dashboard/stores/${store.id}`)}
                  onEdit={() => openEditModal(store)}
                  onDelete={() => setStoreToDelete(store)}
                />
              );
            })
          )}
        </div>
      )}

      {showModal && (
        <form onSubmit={editingStore ? handleUpdateStore : handleCreateStore}>
          <SideDrawer
            title={editingStore ? 'تعديل بيانات المتجر' : 'اضافة متجر جديد'}
            icon={<StoreIcon className="h-6 w-6" />}
            maxWidth="max-w-4xl"
            onClose={closeDrawer}
            footer={(
              <DrawerFooter
                onCancel={closeDrawer}
                submitLabel={editingStore ? 'حفظ التغييرات' : 'أضافة المتجر'}
              />
            )}
          >
            <StoreFormFields
              formData={formData}
              setFormData={setFormData}
              submitted={submitted}
              onImageChange={handleImageChange}
            />
          </SideDrawer>
        </form>
      )}

      {showFilters && (
        <SideDrawer
          title="الفلاتر"
          icon={<Search className="h-6 w-6" />}
          maxWidth="max-w-3xl"
          onClose={() => setShowFilters(false)}
          footer={(
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFilters(defaultFilters)}
                className="h-14 rounded-2xl bg-slate-100 font-black text-slate-600"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="h-14 rounded-2xl bg-linear-to-l from-violet-700 to-fuchsia-500 font-black text-white shadow-lg shadow-violet-200"
              >
                تطبيق الفلاتر
              </button>
            </div>
          )}
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <SelectField
              label="حالة المتجر"
              value={filters.status}
              options={[
                { value: 'all', label: 'الكل' },
                { value: 'active', label: 'نشط' },
                { value: 'inactive', label: 'غير نشط' },
              ]}
              onChange={(value) => setFilters((current) => ({ ...current, status: value as FiltersState['status'] }))}
            />
            <SelectField
              label="نوع الاشتراك"
              value={filters.subscriptionType}
              options={[{ value: 'all', label: 'الكل' }, ...subscriptionOptions]}
              onChange={(value) => setFilters((current) => ({ ...current, subscriptionType: value as FiltersState['subscriptionType'] }))}
            />
            <SelectField
              label="مدة الاشتراك"
              value={filters.subscriptionDuration}
              options={[{ value: 'all', label: 'الكل' }, ...durationOptions]}
              onChange={(value) => setFilters((current) => ({ ...current, subscriptionDuration: value as FiltersState['subscriptionDuration'] }))}
            />
            <SelectField
              label="تقييم المتجر"
              value={filters.rating}
              options={[
                { value: 'all', label: 'الكل' },
                { value: 'ضعيف', label: 'ضعيف' },
                { value: 'متوسط', label: 'متوسط' },
                { value: 'ممتاز', label: 'ممتاز' },
              ]}
              onChange={(value) => setFilters((current) => ({ ...current, rating: value as FiltersState['rating'] }))}
            />
            <SelectField
              label="نوع عملية الإضافة"
              value={filters.addedBy}
              options={[
                { value: 'all', label: 'الكل' },
                { value: 'owner', label: 'أضافه من قبل المسؤول' },
                { value: 'manager', label: 'أضافه من قبل المدير' },
              ]}
              onChange={(value) => setFilters((current) => ({ ...current, addedBy: value as FiltersState['addedBy'] }))}
            />
          </div>
        </SideDrawer>
      )}

      {storeToDelete && (
        <DeleteStoreModal
          store={storeToDelete}
          value={deleteConfirmation}
          onChange={setDeleteConfirmation}
          onClose={() => {
            setStoreToDelete(null);
            setDeleteConfirmation('');
          }}
          onDelete={handleDeleteStore}
        />
      )}
    </div>
  );
};

const BrandMark = ({ logo, accent = 'blue' }: { logo?: string | null; accent?: string }) => {
  if (logo) {
    return <img src={getPublicAssetUrl(logo)} alt="" className="h-12 w-12 rounded-2xl object-cover" />;
  }

  return (
    <div className={cn('grid h-12 w-12 place-items-center rounded-2xl text-lg font-black', accentClasses[accent] || accentClasses.blue)}>
      <span className="leading-none">✣</span>
    </div>
  );
};

const RatingText = ({ rating }: { rating: StoreRating }) => (
  <span
    className={cn(
      'font-black',
      rating === 'ممتاز' && 'text-emerald-500',
      rating === 'متوسط' && 'text-amber-500',
      rating === 'ضعيف' && 'text-red-500'
    )}
  >
    {rating}
  </span>
);

const StoreCard = ({
  row,
  onView,
  onEdit,
  onDelete,
}: {
  row: StoreRow;
  onView: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) => (
  <div className="group relative flex flex-col gap-3.5 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-lg">
    <div className="flex items-start gap-3">
      <div className="grid h-14 w-[68px] shrink-0 place-items-center rounded-xl bg-sky-50">
        <BrandMark logo={row.logo} accent={row.accent} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 text-right">
            <button type="button" onClick={onView} className="w-full truncate text-right text-base font-black text-[#112c71]">
              {row.name}
            </button>
            <p className="mt-1 truncate text-[13px] font-semibold text-[#056494]">{row.planText}</p>
          </div>
          <StatusPill tone={row.statusKey === 'active' ? 'green' : 'red'}>
            {row.statusKey === 'active' ? 'نشط' : 'غير نشط'}
          </StatusPill>
        </div>
      </div>
    </div>

    <div className="flex items-center justify-between gap-2 px-1">
      <div className="flex items-center gap-1 text-right">
        <span className="text-[11px] font-medium text-[#6c809d]">المالك</span>
        <span className="text-[13px] font-black text-[#112c71]">{row.owner}</span>
      </div>
      <div className="rounded-[10px] bg-[#f8fafb] px-2.5 py-2 text-[11px]">
        <span className="text-[rgba(47,58,76,0.66)]">تاريخ انتهاء الاشتراك </span>
        <span className="font-semibold tracking-tight text-[#2f3a4c]">{row.endDate}</span>
      </div>
    </div>

    <div className="flex h-[38px] items-center justify-center gap-2.5 rounded-xl bg-[#fef7f0] px-2">
      <span className="text-xs text-[#b5aa9f]">تقييم المتجر</span>
      <RatingText rating={row.rating} />
    </div>

    {(onEdit || onDelete) && (
      <div className="absolute bottom-3 left-3 flex gap-1 opacity-0 transition group-hover:opacity-100">
        {onEdit && (
          <button type="button" onClick={onEdit} className="rounded-lg bg-white p-1.5 text-slate-400 shadow ring-1 ring-slate-100 hover:text-blue-500" aria-label="تعديل">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={onDelete} className="rounded-lg bg-white p-1.5 text-red-400 shadow ring-1 ring-slate-100 hover:text-red-600" aria-label="حذف">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )}
  </div>
);

const StoreFormFields = ({
  formData,
  setFormData,
  submitted,
  onImageChange,
}: {
  formData: StoreFormState;
  setFormData: Dispatch<SetStateAction<StoreFormState>>;
  submitted: boolean;
  onImageChange: (file: File | undefined) => void;
}) => {
  const missingImage = submitted && !formData.imagePreview;
  const missingOwner = submitted && !formData.owner;

  return (
    <div className="space-y-2">
      <SectionTitle>معلومات المتجر</SectionTitle>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_240px]">
        <div className="space-y-5">
          <FormField
            label="اسم المتجر"
            value={formData.name}
            placeholder="التقنية الحديثة"
            required
            onChange={(value) => setFormData((current) => ({ ...current, name: value }))}
          />
          <SelectField
            label="نوع المتجر"
            value={formData.storeType}
            options={storeTypeOptions.map((value) => ({ value, label: value }))}
            onChange={(value) => setFormData((current) => ({ ...current, storeType: value }))}
          />
        </div>

        <div>
          <label className={cn('mb-2 block text-sm font-bold text-slate-700', missingImage && 'text-red-500')}>
            صورة المتجر
          </label>
          <label
            className={cn(
              'flex h-40 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-slate-50 text-center transition',
              missingImage ? 'border-red-300 bg-red-50 text-red-500' : 'border-sky-300 text-sky-600'
            )}
          >
            {formData.imagePreview ? (
              <img src={formData.imagePreview} alt="store preview" className="h-full w-full rounded-3xl object-cover" />
            ) : (
              <>
                <ImagePlus className="mb-3 h-10 w-10" />
                <span className="font-black">اضافة صورة المتجر</span>
                <span className="mt-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-500">PNG, JPG حتى 2MB</span>
              </>
            )}
            <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(event) => onImageChange(event.target.files?.[0])} />
          </label>
          {missingImage && <p className="mt-2 text-sm font-bold text-red-500">يجب رفع صورة المتجر</p>}
        </div>
      </div>

      <SectionTitle>معلومات المالك</SectionTitle>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <FormField
            label="اسم المالك"
            value={formData.owner}
            placeholder="اكتب اسم المالك الثلاثي"
            required
            onChange={(value) => setFormData((current) => ({ ...current, owner: value }))}
          />
          {missingOwner && <p className="mt-2 text-sm font-bold text-red-500">يجب كتابة اسم مالك المتجر</p>}
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">رقم الهاتف</label>
          <div className="flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
            <span className="ml-3 flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1 text-sm font-bold text-slate-500">
              🇮🇶 +964
            </span>
            <input
              value={formData.phone}
              placeholder="771 345 1330"
              onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
              className="h-full flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-bold text-slate-700">البريد الالكتروني</label>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-500">اختياري</span>
          </div>
          <input
            value={formData.ownerEmail}
            placeholder="Faisal@alphabet.com"
            onChange={(event) => setFormData((current) => ({ ...current, ownerEmail: event.target.value }))}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
          />
        </div>
      </div>

      <SectionTitle>معلومات الاشتراك</SectionTitle>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SelectField
          label="نوع الاشتراك"
          value={formData.subscriptionType}
          options={subscriptionOptions}
          onChange={(value) => setFormData((current) => ({
            ...current,
            subscriptionType: value as StoreFormState['subscriptionType'],
            subscriptionPlanId: value,
          }))}
        />
        <div>
          <label className={cn('mb-2 block text-sm font-bold text-slate-700', submitted && !formData.subscriptionDuration && 'text-red-500')}>
            مدة الاشتراك
          </label>
          <div className={cn('relative flex h-12 items-center rounded-2xl border bg-white px-4 shadow-sm', submitted && !formData.subscriptionDuration ? 'border-red-300 bg-red-50' : 'border-slate-200')}>
            <select
              value={formData.subscriptionDuration}
              onChange={(event) => setFormData((current) => ({ ...current, subscriptionDuration: event.target.value as StoreFormState['subscriptionDuration'] }))}
              className="h-full w-full appearance-none bg-transparent text-sm font-semibold outline-none"
            >
              <option value="">أختيار نوع الاشتراك</option>
              {durationOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute left-4 h-4 w-4 text-slate-400" />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">حالة الاشتراك</label>
          <button
            type="button"
            onClick={() => setFormData((current) => ({ ...current, status: current.status === 'active' ? 'inactive' : 'active' }))}
            className={cn(
              'flex h-11 w-24 items-center rounded-full p-1 text-xs font-black transition',
              formData.status === 'active' ? 'justify-start bg-teal-100 text-teal-600' : 'justify-end bg-red-100 text-red-500'
            )}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white shadow">
              {formData.status === 'active' ? 'نشط' : 'لا'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

const SectionTitle = ({ children }: { children: string }) => (
  <h3 className="mb-5 mt-6 text-xl font-black text-sky-700 first:mt-0">{children}</h3>
);

const DeleteStoreModal = ({
  store,
  value,
  onChange,
  onClose,
  onDelete,
}: {
  store: Store;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onDelete: () => void;
}) => {
  const canDelete = value === store.name;
  const row = getStoreDisplay(store, 0);

  return (
    <div className="fixed inset-0 z-9999 grid place-items-center bg-black/70 p-6" dir="rtl">
      <div className="w-full max-w-3xl rounded-[2rem] bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-8 flex min-h-56 max-w-sm items-center justify-center rounded-[2rem] bg-red-50 p-6">
          <StoreCard row={row} onView={() => undefined} />
        </div>
        <h2 className="text-3xl font-black text-red-600">هل انت متأكد من حذف المتجر</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
          سوف تقوم بحذف المتجر من النظام ولن تستطيع إعادته مرة أخرى، لتأكيد العملية يرجى كتابة اسم المتجر الكامل والضغط على حذف المتجر
        </p>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={store.name}
          className="mt-6 h-14 w-full rounded-2xl border border-slate-200 px-5 text-sm font-bold outline-none focus:border-red-300 focus:ring-4 focus:ring-red-100"
        />
        <div className="mt-8 grid grid-cols-[1fr_2fr] gap-5">
          <button type="button" onClick={onClose} className="h-14 rounded-2xl bg-slate-100 text-lg font-black text-slate-600">
            إلغاء
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={!canDelete}
            className="h-14 rounded-2xl bg-red-600 text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            حذف المتجر
          </button>
        </div>
      </div>
    </div>
  );
};

export default Stores;
