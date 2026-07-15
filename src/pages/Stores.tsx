import { useCallback, useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { systemStoresService, type Store, type CreateStoreRequest } from '../services/systemStoresService';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Edit3,
  Grid2X2,
  ImagePlus,
  List,
  Search,
  SlidersHorizontal,
  Store as StoreIcon,
  Trash2,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'table' | 'cards';
type StoreRating = 'ضعيف' | 'متوسط' | 'ممتاز';

type PaginationState = {
  page: number;
  limit: number;
  total: number;
};

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

const sampleRows = [
  { name: 'الفرسان لخدمات البناء', owner: 'احمد محمد حامد', plan: 'basic', status: 'inactive', rating: 'ضعيف' as StoreRating, accent: 'pink' },
  { name: 'سنتر ماي مارت', owner: 'اسماعيل ابراهيم حور', plan: 'basic', status: 'active', rating: 'متوسط' as StoreRating, accent: 'gray' },
  { name: 'بوينت أي كيو', owner: 'علي محمد علي', plan: 'premium', status: 'active', rating: 'ممتاز' as StoreRating, accent: 'green' },
  { name: 'عين الصقر للموبايلات', owner: 'علي محمد علي', plan: 'basic', status: 'active', rating: 'متوسط' as StoreRating, accent: 'green' },
  { name: 'بوينت أي كيو', owner: 'علي محمد علي', plan: 'basic', status: 'active', rating: 'متوسط' as StoreRating, accent: 'pink' },
  { name: 'الفرسان لخدمات البناء', owner: 'احمد محمد حامد', plan: 'premium', status: 'inactive', rating: 'متوسط' as StoreRating, accent: 'gray' },
  { name: 'التقنية المتحاربة', owner: 'احمد محمد حامد', plan: 'premium', status: 'active', rating: 'متوسط' as StoreRating, accent: 'orange' },
  { name: 'التقنية الحديثة', owner: 'احمد محمد حامد', plan: 'premium', status: 'active', rating: 'متوسط' as StoreRating, accent: 'orange' },
];

const accentClasses: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-500',
  orange: 'bg-orange-50 text-orange-500',
  pink: 'bg-pink-50 text-pink-500',
  gray: 'bg-slate-50 text-slate-800',
};

const publicAssetBaseUrl = import.meta.env.VITE_PUBLIC_URL || 'https://pub-fe6c304a027a4a3b9e3efb4fd3520dcf.r2.dev/';

const getPublicAssetUrl = (path?: string | null) => {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }

  return `${publicAssetBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
};

const getPaginationPages = (currentPage: number, totalPages: number) => {
  const visibleCount = 5;
  const half = Math.floor(visibleCount / 2);
  const start = Math.max(1, Math.min(currentPage - half, totalPages - visibleCount + 1));
  const end = Math.min(totalPages, start + visibleCount - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

const Stores = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
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
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
  });

  const fetchStores = useCallback(async (page: number, limit: number) => {
    try {
      setLoading(true);
      setError('');
      const response = await systemStoresService.getAllStores({ page, limit });
      setStores(response.data || []);
      setPagination((current) => ({
        ...current,
        page: response.page ?? page,
        limit: response.limit ?? limit,
        total: response.total ?? response.data?.length ?? 0,
      }));
    } catch (err) {
      setError('فشل في جلب المتاجر. يرجى المحاولة مرة أخرى.');
      console.error('Error fetching stores:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores(pagination.page, pagination.limit);
  }, [fetchStores, pagination.page, pagination.limit]);

  const handleCreateStore = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!isFormValid) return;

    try {
      setError('');
      await systemStoresService.createStore(toApiPayload(formData));
      setShowModal(false);
      resetForm();
      fetchStores(pagination.page, pagination.limit);
    } catch (err) {
      setError('فشل في إنشاء المتجر. يرجى المحاولة مرة أخرى.');
      console.error('Error creating store:', err);
    }
  };

  const handleUpdateStore = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;
    setSubmitted(true);
    if (!isFormValid) return;
    
    try {
      setError('');
      await systemStoresService.updateStore(editingStore.id, toApiPayload(formData));
      setShowModal(false);
      setEditingStore(null);
      resetForm();
      fetchStores(pagination.page, pagination.limit);
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
      fetchStores(pagination.page, pagination.limit);
    } catch (err) {
      setError('فشل في حذف المتجر. يرجى المحاولة مرة أخرى.');
      console.error('Error deleting store:', err);
    }
  };

  const handlePageChange = (page: number) => {
    const totalPages = Math.max(1, Math.ceil((pagination.total || visibleStores.length) / pagination.limit));
    setPagination((current) => ({
      ...current,
      page: Math.min(Math.max(page, 1), totalPages),
    }));
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

  const openCreateModal = () => {
    setEditingStore(null);
    resetForm();
    setSubmitted(false);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setSubmitted(false);
  };

  const viewStoreDetails = (id: string) => {
    navigate(`/dashboard/stores/${id}`);
  };

  const toApiPayload = (data: StoreFormState): CreateStoreRequest => ({
    name: data.name,
    owner: data.owner,
    ownerEmail: data.ownerEmail,
    subscriptionPlanId: data.subscriptionPlanId || data.subscriptionType,
    status: data.status,
  });

  const visibleStores = useMemo(() => {
    return stores.filter((store, index) => {
      const row = getStoreDisplay(store, index);
      const matchesSearch = [row.name, row.owner, row.planText]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase());
      const matchesStatus = filters.status === 'all' || row.statusKey === filters.status;
      const matchesPlan = filters.subscriptionType === 'all' || row.planKey === filters.subscriptionType;
      const matchesRating = filters.rating === 'all' || row.rating === filters.rating;
      return matchesSearch && matchesStatus && matchesPlan && matchesRating;
    });
  }, [stores, searchTerm, filters]);

  const stats = useMemo(() => {
    const active = stores.filter((store) => getStoreStatusKey(store) === 'active').length;
    return [
      { title: 'إجمالي المتاجر', value: stores.length || 121, icon: StoreIcon, tone: 'blue' },
      { title: 'المتاجر الجديدة', value: Math.max(1, Math.round((stores.length || 121) * 0.1)) || 121, icon: CirclePlus, tone: 'teal' },
      { title: 'المتاجر النشطة', value: active || 121, icon: StoreIcon, tone: 'amber' },
      { title: 'الاشتراكات المنتهية', value: stores.filter((store) => getStoreStatusKey(store) === 'inactive').length || 12, icon: CalendarDays, tone: 'rose' },
    ];
  }, [stores]);

  const filterCount = Object.values(filters).filter((value) => value !== 'all').length;
  const isFormValid = Boolean(formData.name && formData.owner && formData.subscriptionDuration && formData.imagePreview);

  const activeRows = stores.length > 0 ? visibleStores : [];
  const renderedRows = activeRows.length > 0 ? activeRows : [];
  const totalItems = pagination.total || visibleStores.length;

  const handleImageChange = (file: File | undefined) => {
    if (!file) return;
    setFormData((current) => ({
      ...current,
      imagePreview: URL.createObjectURL(file),
    }));
  };

  if (loading && stores.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-5 bg-[#f8fafc] text-right" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <PageIcon icon={StoreIcon} />
          <div>
            <h1 className="text-2xl font-black text-slate-900">إدارة المتاجر</h1>
            <p className="text-sm text-slate-500">
              هناك <span className="font-bold text-violet-600">{visibleStores.length || 46} متجر</span> في قائمة المتاجر
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-l from-violet-700 to-fuchsia-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:scale-[1.01]"
        >
          إضافة متجر جديد
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
            <CirclePlus className="h-5 w-5" />
          </span>
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewMode('table')}
            className={cn('view-button', viewMode === 'table' && 'view-button-active')}
          >
            جدول
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={cn('view-button', viewMode === 'cards' && 'view-button-active')}
          >
            بطاقات
            <Grid2X2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowFilters(true)}
            className={cn('view-button relative', filterCount > 0 && 'bg-blue-600 text-white')}
          >
            الفلاتر
            {filterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                +{filterCount}
              </span>
            )}
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <div className="relative min-w-[260px] max-w-md flex-1">
            <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث عن المتاجر"
              className="h-12 w-full rounded-2xl border border-slate-100 bg-slate-50 pr-11 pl-4 text-sm outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </div>
          <button className="h-12 rounded-2xl bg-cyan-50 px-6 text-sm font-bold text-cyan-500">البحث</button>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-black text-slate-900">
          {searchTerm || filterCount > 0 ? 'نتائج البحث والفلاتر' : 'جميع المتاجر'}
        </h2>

        {viewMode === 'table' ? (
          <StoresTable
            stores={renderedRows}
            fallbackRows={stores.length === 0 ? sampleRows : []}
            onView={viewStoreDetails}
            onEdit={openEditModal}
            onDelete={setStoreToDelete}
            pagination={{
              page: pagination.page,
              limit: pagination.limit,
              total: totalItems,
              onPageChange: handlePageChange,
            }}
          />
        ) : (
          <StoresCards
            stores={renderedRows}
            fallbackRows={stores.length === 0 ? sampleRows : []}
            onView={viewStoreDetails}
            onEdit={openEditModal}
            onDelete={setStoreToDelete}
          />
        )}
      </div>

      {showModal && (
        <StoreFormModal
          editingStore={editingStore}
          formData={formData}
          setFormData={setFormData}
          submitted={submitted}
          onImageChange={handleImageChange}
          onClose={() => {
            setShowModal(false);
            setEditingStore(null);
            resetForm();
          }}
          onSubmit={editingStore ? handleUpdateStore : handleCreateStore}
        />
      )}

      {showFilters && (
        <FiltersPanel
          filters={filters}
          setFilters={setFilters}
          onClose={() => setShowFilters(false)}
          onReset={() => setFilters(defaultFilters)}
        />
      )}

      {storeToDelete && (
        <DeleteModal
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

const getStoreStatusKey = (store: Store): 'active' | 'inactive' => {
  return store.subscription?.status === 'ACTIVE' ? 'active' : 'inactive';
};

const getStoreTypeText = (storeType: string | null | undefined) => {
  if (!storeType) return storeTypeOptions[0];
  return storeType === 'ECOMMERCE' ? 'متجر منتجات الكترونية' : storeType;
};

const getStoreDisplay = (store: Store, index: number) => {
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
    statusText: statusKey === 'active' ? 'نشط' : 'غير نشط',
    endDate: store.subscription?.end_at ? new Date(store.subscription.end_at).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }) : 'Dec 17, 2026',
    rating: ratings[index % ratings.length],
    logo: store.logo,
    accent: ['pink', 'gray', 'green', 'orange', 'blue'][index % 5],
  };
};

const PageIcon = ({ icon: Icon }: { icon: LucideIcon }) => (
  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
    <Icon className="h-6 w-6" />
    <span className="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-violet-200" />
  </div>
);

const StatCard = ({ title, value, icon: Icon, tone }: { title: string; value: number; icon: LucideIcon; tone: string }) => {
  const tones: Record<string, { iconWrap: string; icon: string }> = {
    blue: {
      iconWrap: 'bg-sky-50 shadow-sky-100',
      icon: 'text-sky-500',
    },
    teal: {
      iconWrap: 'bg-teal-50 shadow-teal-100',
      icon: 'text-teal-500',
    },
    amber: {
      iconWrap: 'bg-orange-50 shadow-orange-100',
      icon: 'text-orange-500',
    },
    rose: {
      iconWrap: 'bg-red-50 shadow-red-100',
      icon: 'text-red-500',
    },
  };
  const color = tones[tone] || tones.blue;

  return (
    <div className="flex min-h-[78px] items-center justify-between gap-4 rounded-[1.45rem] bg-white px-5 py-4 shadow-[0_12px_35px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
      <div className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl shadow-lg', color.iconWrap)}>
        <Icon className={cn('h-6 w-6 stroke-[2.4]', color.icon)} />
      </div>

      <div className="min-w-0 flex-1 text-right">
        <p className="truncate text-sm font-black text-slate-700">{title}</p>
        <div className="mt-1.5 flex items-center justify-start gap-2" dir="ltr">
          <span className="text-xs font-bold text-emerald-500">12.6% ↗</span>
          <span className="text-2xl font-black leading-none text-slate-950">{value}</span>
        </div>
      </div>
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

const StatusBadge = ({ status }: { status: 'active' | 'inactive' }) => (
  <span className={cn(
    'inline-flex rounded-full px-3 py-1 text-xs font-bold',
    status === 'active' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'
  )}>
    {status === 'active' ? 'نشط' : 'غير نشط'}
  </span>
);

const RatingBadge = ({ rating }: { rating: StoreRating }) => (
  <span className={cn(
    'font-bold',
    rating === 'ممتاز' && 'text-emerald-500',
    rating === 'متوسط' && 'text-amber-500',
    rating === 'ضعيف' && 'text-red-500'
  )}>
    {rating}
  </span>
);

const PlanBadge = ({ plan }: { plan: string }) => (
  <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-600">
    {plan}
  </span>
);

const StoresTable = ({
  stores,
  fallbackRows,
  onView,
  onEdit,
  onDelete,
  pagination,
}: {
  stores: Store[];
  fallbackRows: typeof sampleRows;
  onView: (id: string) => void;
  onEdit: (store: Store) => void;
  onDelete: (store: Store) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}) => {
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
  const pages = getPaginationPages(pagination.page, totalPages);
  const canGoPrevious = pagination.page > 1;
  const canGoNext = pagination.page < totalPages;

  return (
  <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px]">
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
          {stores.map((store, index) => {
            const row = getStoreDisplay(store, index);
            return (
              <tr key={store.id} className="text-sm text-slate-700 transition hover:bg-slate-50/70">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                    <BrandMark logo={row.logo} accent={row.accent} />
                  </div>
                </td>
                <td className="px-5 py-4 font-bold text-slate-900">
                  <button onClick={() => onView(store.id)}>{row.name}</button>
                </td>
                <td className="px-5 py-4">{row.owner}</td>
                <td className="px-5 py-4"><StatusBadge status={row.statusKey} /></td>
                <td className="px-5 py-4"><PlanBadge plan={row.planText} /></td>
                <td className="px-5 py-4 text-slate-600">{row.endDate}</td>
                <td className="px-5 py-4"><RatingBadge rating={row.rating} /></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => onEdit(store)} className="text-slate-400 transition hover:text-blue-500" aria-label="تعديل">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDelete(store)} className="text-red-400 transition hover:text-red-600" aria-label="حذف">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {stores.length === 0 && fallbackRows.map((row, index) => (
            <tr key={`${row.name}-${index}`} className="text-sm text-slate-700">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                  <BrandMark accent={row.accent} />
                </div>
              </td>
              <td className="px-5 py-4 font-bold text-slate-900">{row.name}</td>
              <td className="px-5 py-4">{row.owner}</td>
              <td className="px-5 py-4"><StatusBadge status={row.status as 'active' | 'inactive'} /></td>
              <td className="px-5 py-4"><PlanBadge plan={row.plan === 'premium' ? 'الاشتراك الاحترافي' : 'الاشتراك العادي'} /></td>
              <td className="px-5 py-4 text-slate-600">Dec 17, 2026</td>
              <td className="px-5 py-4"><RatingBadge rating={row.rating} /></td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3 text-slate-300">
                  <Edit3 className="h-4 w-4" />
                  <Trash2 className="h-4 w-4 text-red-300" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="flex flex-row-reverse items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
      <button className="rounded-xl border border-violet-200 px-4 py-2 font-bold text-violet-600">
        {pagination.limit} العناصر لكل صفحة
      </button>
      <div className="flex flex-row-reverse items-center gap-2">
        {totalPages > 1 && (
          <button
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            disabled={!canGoPrevious}
            className="grid h-8 w-8 place-items-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-violet-50 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="الصفحة السابقة"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => pagination.onPageChange(page)}
            className={cn('grid h-8 w-8 place-items-center rounded-xl font-bold transition', page === pagination.page ? 'bg-violet-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-violet-50 hover:text-violet-600')}
          >
            {page}
          </button>
        ))}
        {totalPages > 1 && (
          <button
            onClick={() => pagination.onPageChange(pagination.page + 1)}
            disabled={!canGoNext}
            className="grid h-8 w-8 place-items-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-violet-50 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="الصفحة التالية"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  </div>
  );
};

const StoresCards = ({
  stores,
  fallbackRows,
  onView,
  onEdit,
  onDelete,
}: {
  stores: Store[];
  fallbackRows: typeof sampleRows;
  onView: (id: string) => void;
  onEdit: (store: Store) => void;
  onDelete: (store: Store) => void;
}) => {
  const cards = stores.map((store, index) => ({ store, row: getStoreDisplay(store, index) }));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ store, row }) => (
        <StoreCard
          key={store.id}
          row={row}
          onView={() => onView(store.id)}
          onEdit={() => onEdit(store)}
          onDelete={() => onDelete(store)}
        />
      ))}
      {cards.length === 0 && fallbackRows.concat(fallbackRows).map((row, index) => (
        <StoreCard
          key={`${row.name}-${index}`}
          row={{
            id: String(index),
            name: row.name,
            owner: row.owner,
            planText: row.plan === 'premium' ? 'الاشتراك الاحترافي' : 'الاشتراك العادي',
            planKey: row.plan,
            statusKey: row.status as 'active' | 'inactive',
            statusText: row.status === 'active' ? 'نشط' : 'غير نشط',
            endDate: 'Dec 17, 2026',
            rating: row.rating,
            logo: null,
            accent: row.accent,
          }}
        />
      ))}
    </div>
  );
};

const StoreCard = ({
  row,
  onView,
  onEdit,
  onDelete,
}: {
  row: ReturnType<typeof getStoreDisplay>;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) => (
  <div className="rounded-[1.7rem] bg-white p-4 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg">
    <div className="mb-5 flex items-start justify-between">
      <StatusBadge status={row.statusKey} />
      <div className="flex items-center gap-3">
        <div>
          <button onClick={onView} className="text-lg font-black text-slate-900">{row.name}</button>
          <p className="mt-1 text-sm font-semibold text-sky-700">{row.planText}</p>
        </div>
        <BrandMark logo={row.logo} accent={row.accent} />
      </div>
    </div>
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-slate-400">المالك</span>
        <span className="font-bold text-slate-800">{row.owner}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-400">تاريخ انتهاء الاشتراك</span>
        <span className="font-semibold text-slate-600">{row.endDate}</span>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3">
        <span className="text-slate-400">تقييم المتجر</span>
        <RatingBadge rating={row.rating} />
      </div>
      {(onEdit || onDelete) && (
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onEdit} className="rounded-xl bg-slate-50 p-2 text-slate-400 hover:text-blue-500">
            <Edit3 className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="rounded-xl bg-red-50 p-2 text-red-400 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  </div>
);

const FieldLabel = ({ children, optional, error }: { children: string; optional?: boolean; error?: boolean }) => (
  <label className={cn('mb-2 block text-sm font-bold text-slate-700', error && 'text-red-500')}>
    {children}
    {optional && <span className="mr-2 font-semibold text-emerald-500">اختياري</span>}
  </label>
);

const StoreFormModal = ({
  editingStore,
  formData,
  setFormData,
  submitted,
  onImageChange,
  onClose,
  onSubmit,
}: {
  editingStore: Store | null;
  formData: StoreFormState;
  setFormData: Dispatch<SetStateAction<StoreFormState>>;
  submitted: boolean;
  onImageChange: (file: File | undefined) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) => {
  const missingImage = submitted && !formData.imagePreview;
  const missingOwner = submitted && !formData.owner;

  return (
    <div className="fixed inset-0 z-9999 bg-black/35" dir="rtl" onMouseDown={onClose}>
      <form onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()} className="fixed inset-y-0 left-0 z-10000 flex h-dvh w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl">
        <button type="button" onClick={onClose} className="absolute left-5 top-5 rounded-full bg-slate-50 p-2 text-slate-400">
          <X className="h-5 w-5" />
        </button>

        <div className="shrink-0 px-6 pt-6 sm:px-8 sm:pt-8">
          <div className="flex items-center justify-start gap-4">
            <PageIcon icon={StoreIcon} />
            <h2 className="text-3xl font-black text-violet-700">{editingStore ? 'تعديل بيانات المتجر' : 'إضافة متجر جديد'}</h2>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden">
          <SectionTitle>معلومات المتجر</SectionTitle>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_280px]">
            <div className="space-y-5">
              <TextField
                label="اسم المتجر"
                value={formData.name}
                placeholder="التقنية الحديثة"
                error={submitted && !formData.name}
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
            <FieldLabel error={missingImage}>صورة المتجر</FieldLabel>
            <label className={cn(
              'flex h-40 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-slate-50 text-center transition',
              missingImage ? 'border-red-300 bg-red-50 text-red-500' : 'border-sky-300 text-sky-600'
            )}>
              {formData.imagePreview ? (
                <img src={formData.imagePreview} alt="store preview" className="h-full w-full rounded-3xl object-cover" />
              ) : (
                <>
                  <ImagePlus className="mb-3 h-10 w-10" />
                  <span className="font-black">إضافة صورة المتجر</span>
                  <span className="mt-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-500">PNG, JPG 2MB</span>
                </>
              )}
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(event) => onImageChange(event.target.files?.[0])} />
            </label>
            {missingImage && <p className="mt-2 text-sm font-bold text-red-500">يجب رفع صورة المتجر</p>}
          </div>
        </div>

        <SectionTitle>معلومات المالك</SectionTitle>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextField
            label="اسم المالك"
            value={formData.owner}
            placeholder="اكتب اسم المالك الثلاثي"
            error={missingOwner}
            onChange={(value) => setFormData((current) => ({ ...current, owner: value }))}
          />
          <TextField
            label="رقم الهاتف"
            value={formData.phone}
            placeholder="771 345 1330"
            onChange={(value) => setFormData((current) => ({ ...current, phone: value }))}
            prefix="+964"
          />
          <TextField
            label="البريد الالكتروني"
            value={formData.ownerEmail}
            placeholder="Faisal@alphabet.com"
            optional
            onChange={(value) => setFormData((current) => ({ ...current, ownerEmail: value }))}
          />
        </div>
        {missingOwner && <p className="mt-2 text-sm font-bold text-red-500">يجب كتابة اسم مالك المتجر</p>}

        <SectionTitle>معلومات الاشتراك</SectionTitle>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <SelectField
            label="نوع الاشتراك"
            value={formData.subscriptionType}
            options={subscriptionOptions}
            onChange={(value) => setFormData((current) => ({ ...current, subscriptionType: value as StoreFormState['subscriptionType'], subscriptionPlanId: value }))}
          />
          <SelectField
            label="مدة الاشتراك"
            value={formData.subscriptionDuration}
            placeholder="اختيار نوع الاشتراك"
            error={submitted && !formData.subscriptionDuration}
            options={durationOptions}
            onChange={(value) => setFormData((current) => ({ ...current, subscriptionDuration: value as StoreFormState['subscriptionDuration'] }))}
          />
          <div>
            <FieldLabel>حالة الاشتراك</FieldLabel>
            <button
              type="button"
              onClick={() => setFormData((current) => ({ ...current, status: current.status === 'active' ? 'inactive' : 'active' }))}
              className={cn(
                'flex h-11 w-24 items-center rounded-full p-1 text-xs font-black transition',
                formData.status === 'active' ? 'justify-start bg-teal-100 text-teal-600' : 'justify-end bg-red-100 text-red-500'
              )}
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white shadow">{formData.status === 'active' ? 'نشط' : 'لا'}</span>
            </button>
          </div>
        </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button type="button" onClick={onClose} className="h-14 min-w-40 rounded-2xl bg-slate-100 px-8 font-black text-slate-600">
            إلغاء
          </button>
          <button type="submit" className="h-14 min-w-60 rounded-2xl bg-linear-to-l from-violet-700 to-fuchsia-500 px-10 font-black text-white shadow-lg shadow-violet-200">
            {editingStore ? 'حفظ التغييرات' : 'إضافة المتجر'}
          </button>
        </div>
        </div>
      </form>
    </div>
  );
};

const SectionTitle = ({ children }: { children: string }) => (
  <h3 className="mb-5 mt-8 text-xl font-black text-sky-700">{children}</h3>
);

const TextField = ({
  label,
  value,
  placeholder,
  optional,
  error,
  prefix,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  optional?: boolean;
  error?: boolean;
  prefix?: string;
  onChange: (value: string) => void;
}) => (
  <div>
    <FieldLabel optional={optional} error={error}>{label}</FieldLabel>
    <div className={cn('flex h-12 items-center rounded-2xl border bg-white px-4 shadow-sm', error ? 'border-red-300 bg-red-50' : 'border-slate-200')}>
      {prefix && <span className="ml-3 rounded-xl bg-slate-100 px-3 py-1 text-sm font-bold text-slate-500">{prefix}</span>}
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-full flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
      />
    </div>
  </div>
);

const SelectField = ({
  label,
  value,
  options,
  placeholder,
  error,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  error?: boolean;
  onChange: (value: string) => void;
}) => (
  <div>
    <FieldLabel error={error}>{label}</FieldLabel>
    <div className={cn('relative flex h-12 items-center rounded-2xl border bg-white px-4 shadow-sm', error ? 'border-red-300 bg-red-50' : 'border-slate-200')}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-full w-full appearance-none bg-transparent text-sm font-semibold outline-none"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute left-4 h-4 w-4 text-slate-400" />
    </div>
  </div>
);

const FiltersPanel = ({
  filters,
  setFilters,
  onClose,
  onReset,
}: {
  filters: FiltersState;
  setFilters: Dispatch<SetStateAction<FiltersState>>;
  onClose: () => void;
  onReset: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-stretch justify-start bg-black/35 p-0 sm:p-6" dir="rtl">
    <div className="mr-auto flex h-full w-full max-w-4xl flex-col overflow-y-auto bg-white p-8 shadow-2xl sm:rounded-[2rem]">
      <div className="mb-10 flex items-center justify-end gap-4">
        <PageIcon icon={Search} />
        <h2 className="text-3xl font-black text-violet-700">الفلاتر</h2>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SelectField
          label="حالة المتجر"
          value={filters.status}
          options={[{ value: 'all', label: 'الكل' }, { value: 'active', label: 'نشط' }, { value: 'inactive', label: 'غير نشط' }]}
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
          options={[{ value: 'all', label: 'الكل' }, { value: 'ضعيف', label: 'ضعيف' }, { value: 'متوسط', label: 'متوسط' }, { value: 'ممتاز', label: 'ممتاز' }]}
          onChange={(value) => setFilters((current) => ({ ...current, rating: value as FiltersState['rating'] }))}
        />
        <SelectField
          label="نوع عملية الإضافة"
          value={filters.addedBy}
          options={[{ value: 'all', label: 'الكل' }, { value: 'owner', label: 'أضافه من قبل المسؤول' }, { value: 'manager', label: 'أضافه من قبل المدير' }]}
          onChange={(value) => setFilters((current) => ({ ...current, addedBy: value as FiltersState['addedBy'] }))}
        />
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-10">
        <button onClick={onReset} className="h-14 min-w-40 rounded-2xl bg-slate-100 px-8 font-black text-slate-600">إلغاء</button>
        <button onClick={onClose} className="h-14 min-w-60 rounded-2xl bg-linear-to-l from-violet-700 to-fuchsia-500 px-10 font-black text-white shadow-lg shadow-violet-200">تطبيق الفلاتر</button>
      </div>
    </div>
  </div>
);

const DeleteModal = ({
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

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6" dir="rtl">
      <div className="w-full max-w-4xl rounded-[2rem] bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-8 flex min-h-72 max-w-3xl items-center justify-center rounded-[2rem] bg-red-50">
          <StoreCard row={{
            id: store.id,
            name: store.name,
            owner: store.owner?.name || store.name,
            planText: store.subscription?.plan.name || 'الاشتراك الاحترافي',
            planKey: 'premium',
            statusKey: getStoreStatusKey(store),
            statusText: getStoreStatusKey(store) === 'active' ? 'نشط' : 'غير نشط',
            endDate: store.subscription?.end_at ? new Date(store.subscription.end_at).toLocaleDateString('en-US') : 'Dec 17, 2026',
            rating: 'متوسط',
            logo: store.logo,
            accent: 'blue',
          }} />
        </div>

        <h2 className="mb-5 text-4xl font-black text-red-600">هل انت متأكد من حذف المتجر</h2>
        <p className="mx-auto mb-6 max-w-3xl text-xl leading-9 text-slate-600">
          سوف تقوم بحذف المتجر من النظام ولن تستطيع إعادته مرة أخرى، لتأكيد العملية يرجى كتابة اسم المتجر الكامل والضغط على حذف المتجر
        </p>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={store.name}
          className="mb-8 h-14 w-full rounded-2xl border border-slate-200 px-5 text-sm font-bold outline-none focus:border-red-300 focus:ring-4 focus:ring-red-100"
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button onClick={onClose} className="h-16 min-w-52 rounded-2xl bg-slate-100 px-10 text-xl font-black text-slate-600">إلغاء</button>
          <button
            onClick={onDelete}
            disabled={!canDelete}
            className="h-16 min-w-80 rounded-2xl bg-red-600 px-10 text-xl font-black text-white shadow-lg shadow-red-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            حذف المتجر
          </button>
        </div>
      </div>
    </div>
  );
};

export default Stores;
