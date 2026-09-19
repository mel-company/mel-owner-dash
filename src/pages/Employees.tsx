import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Pencil, Plus, ShieldCheck, Trash2, UserRound, Users } from 'lucide-react';
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
import {
  EmployeeRoleEnum,
  systemEmployeesService,
  type CreateEmployeeRequest,
  type SystemEmployee,
} from '../services/systemEmployeesService';

type FiltersState = {
  role: string;
  status: 'all' | 'active' | 'inactive';
  addedAt: string;
};

type EmployeeFormState = CreateEmployeeRequest & {
  confirmPassword: string;
  status: 'active' | 'inactive';
  mustChangePassword: boolean;
};

const defaultFormData: EmployeeFormState = {
  name: '',
  email: '',
  phone: '',
  role: EmployeeRoleEnum.EMPLOYEE,
  password: '',
  confirmPassword: '',
  status: 'active',
  mustChangePassword: true,
};

const defaultFilters: FiltersState = {
  role: '',
  status: 'all',
  addedAt: '',
};

const roleOptions = [
  { value: EmployeeRoleEnum.EMPLOYEE, label: 'موظف', tone: 'blue' as const },
  { value: 'OWNER', label: 'المالك', tone: 'amber' as const },
  { value: EmployeeRoleEnum.DEVELOPER, label: 'مطور', tone: 'green' as const },
  { value: EmployeeRoleEnum.SUPPORT, label: 'دعم فني', tone: 'red' as const },
];

const formRoleOptions = [
  { value: EmployeeRoleEnum.EMPLOYEE, label: 'موظف' },
  { value: EmployeeRoleEnum.DEVELOPER, label: 'مطور' },
  { value: EmployeeRoleEnum.SUPPORT, label: 'دعم فني' },
  { value: 'ADMIN', label: 'أدمن' },
];

const Employees = () => {
  const [employees, setEmployees] = useState<SystemEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<FiltersState>(defaultFilters);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<SystemEmployee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<SystemEmployee | null>(null);
  const [employeeToDisable, setEmployeeToDisable] = useState<SystemEmployee | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [disableConfirmation, setDisableConfirmation] = useState('');
  const [formData, setFormData] = useState<EmployeeFormState>(defaultFormData);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await systemEmployeesService.getAllEmployees({ page: 1, limit: 100 });
      setEmployees(response.data || []);
    } catch (err) {
      setError('فشل في جلب الموظفين. يرجى المحاولة مرة أخرى.');
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => employees.filter((employee) => {
    const searchable = [employee.name, employee.email, employee.phone].join(' ').toLowerCase();
    const matchesSearch = searchable.includes(search.trim().toLowerCase());
    const matchesRole = !filters.role || employee.role === filters.role;
    const active = isActive(employee.status);
    const matchesStatus =
      filters.status === 'all'
      || (filters.status === 'active' && active)
      || (filters.status === 'inactive' && !active);
    const matchesDate = !filters.addedAt || formatDateInput(employee.createdAt) === filters.addedAt;
    return matchesSearch && matchesRole && matchesStatus && matchesDate;
  }), [employees, filters, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleEmployees = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeCount = employees.filter((employee) => isActive(employee.status)).length;
  const filterCount = [
    filters.role,
    filters.status !== 'all' ? filters.status : '',
    filters.addedAt,
  ].filter(Boolean).length;

  const roleCounts = useMemo(() => ({
    employee: employees.filter((item) => item.role === EmployeeRoleEnum.EMPLOYEE).length,
    owner: employees.filter((item) => item.role === 'OWNER').length,
    developer: employees.filter((item) => item.role === EmployeeRoleEnum.DEVELOPER).length,
    support: employees.filter((item) => item.role === EmployeeRoleEnum.SUPPORT).length,
  }), [employees]);

  const openCreateDrawer = () => {
    setEditingEmployee(null);
    setFormData(defaultFormData);
    setShowDrawer(true);
  };

  const openEditDrawer = (employee: SystemEmployee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone || '',
      role: (employee.role as EmployeeRoleEnum) || EmployeeRoleEnum.EMPLOYEE,
      password: '',
      confirmPassword: '',
      status: isActive(employee.status) ? 'active' : 'inactive',
      mustChangePassword: false,
    });
    setShowDrawer(true);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setEditingEmployee(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingEmployee && formData.password !== formData.confirmPassword) {
      setError('كلمة المرور وتأكيدها غير متطابقتين.');
      return;
    }

    try {
      setError('');
      if (editingEmployee) {
        await systemEmployeesService.updateEmployee(editingEmployee.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          status: formData.status,
        });
      } else {
        await systemEmployeesService.createEmployee({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          password: formData.password,
        });
      }
      closeDrawer();
      fetchEmployees();
    } catch (err) {
      setError(editingEmployee ? 'فشل في تحديث الموظف.' : 'فشل في إنشاء الموظف.');
      console.error('Error saving employee:', err);
    }
  };

  const handleDelete = async () => {
    if (!employeeToDelete || deleteConfirmation !== employeeToDelete.name) return;
    try {
      setError('');
      await systemEmployeesService.deleteEmployee(employeeToDelete.id);
      setEmployeeToDelete(null);
      setDeleteConfirmation('');
      fetchEmployees();
    } catch (err) {
      setError('فشل في حذف الموظف. يرجى المحاولة مرة أخرى.');
      console.error('Error deleting employee:', err);
    }
  };

  const handleDisable = async () => {
    if (!employeeToDisable || disableConfirmation !== employeeToDisable.name) return;
    try {
      setError('');
      await systemEmployeesService.updateEmployee(employeeToDisable.id, { status: 'inactive' });
      setEmployeeToDisable(null);
      setDisableConfirmation('');
      fetchEmployees();
    } catch (err) {
      setError('فشل في إيقاف حساب الموظف.');
      console.error('Error disabling employee:', err);
    }
  };

  const handleStatusToggle = async (employee: SystemEmployee) => {
    if (isActive(employee.status)) {
      setEmployeeToDisable(employee);
      setDisableConfirmation('');
      return;
    }

    try {
      setError('');
      await systemEmployeesService.updateEmployee(employee.id, { status: 'active' });
      fetchEmployees();
    } catch (err) {
      setError('فشل في تفعيل حساب الموظف.');
      console.error('Error enabling employee:', err);
    }
  };

  if (loading && employees.length === 0) return <LoadingState />;

  return (
    <div className="min-h-screen space-y-5 bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="ادارة الموظفين"
        description={<>هناك <span className="font-black text-violet-600">{employees.length}</span> موظف في قائمة الموظفين</>}
        icon={<Users className="h-6 w-6" />}
        action={(
          <PrimaryActionButton onClick={openCreateDrawer}>
            اضافة موظف جديد
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20">
              <Plus className="h-4 w-4" />
            </span>
          </PrimaryActionButton>
        )}
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_1.4fr]">
        <StatCard
          title="أجمالي الموظفين"
          value={employees.length.toLocaleString()}
          icon={<Users />}
          tone="blue"
          hint={null}
        />
        <StatCard
          title="الموظفين الفعالين"
          value={activeCount}
          icon={<ShieldCheck />}
          tone="amber"
          hint="0% ↗"
        />
        <div className="flex min-h-[88px] items-center justify-between gap-4 rounded-[1.45rem] bg-white px-5 py-4 shadow-[0_12px_35px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-500 shadow-lg shadow-emerald-100">
            <UserRound className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1 text-right">
            <p className="text-sm font-black text-slate-700">أعداد الموظفين حسب دور</p>
            <div className="mt-2 flex flex-wrap items-center justify-end gap-3" dir="ltr">
              <RoleCount label="دعم فني" value={roleCounts.support} className="text-pink-500" />
              <span className="h-2 w-px bg-slate-200" />
              <RoleCount label="مطور" value={roleCounts.developer} className="text-emerald-500" />
              <span className="h-2 w-px bg-slate-200" />
              <RoleCount label="المالك" value={roleCounts.owner} className="text-amber-500" />
              <span className="h-2 w-px bg-slate-200" />
              <RoleCount label="موظف" value={roleCounts.employee} className="text-sky-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-slate-900">
          {search || filterCount > 0 ? 'نتائج البحث والفلاتر' : 'جميع الموظفين'}
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDraftFilters(filters);
              setShowFilters(true);
            }}
            className={cn(
              'view-button relative inline-flex items-center gap-2',
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

          <div className="flex items-center gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100" dir="ltr">
            <button type="button" className="h-10 rounded-xl bg-cyan-50 px-5 text-sm font-bold text-cyan-500">
              البحث
            </button>
            <div className="relative min-w-[220px]">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="ابحث عن الموظفين"
                className="h-10 w-full rounded-xl border-0 bg-transparent px-3 text-right text-sm font-semibold outline-none placeholder:text-slate-400"
                dir="rtl"
              />
            </div>
          </div>
        </div>
      </div>

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
        {visibleEmployees.length === 0 ? (
          <EmptyState
            title="لا يوجد موظفين"
            action={<PrimaryActionButton onClick={openCreateDrawer}>اضافة موظف جديد</PrimaryActionButton>}
          />
        ) : (
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
                <th className="px-5 py-5 text-right">اسم الموظف</th>
                <th className="px-5 py-5 text-right">رقم الهاتف</th>
                <th className="px-5 py-5 text-right">تاريخ الاضافة</th>
                <th className="px-5 py-5 text-right">الدور</th>
                <th className="px-5 py-5 text-right">الحالة</th>
                <th className="px-5 py-5 text-right">العمليات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleEmployees.map((employee, index) => {
                const active = isActive(employee.status);
                const roleMeta = getRoleMeta(employee.role);
                return (
                  <tr key={employee.id} className="text-sm text-slate-700 transition hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-500">
                          {String((currentPage - 1) * pageSize + index + 1).padStart(2, '0')}
                        </span>
                        <span className="font-black text-slate-950">{employee.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-600" dir="ltr">
                      {formatPhone(employee.phone)}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{formatDisplayDate(employee.createdAt)}</td>
                    <td className="px-5 py-4">
                      <StatusPill tone={roleMeta.tone}>{roleMeta.label}</StatusPill>
                    </td>
                    <td className="px-5 py-4">
                      <StatusToggle active={active} onClick={() => handleStatusToggle(employee)} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEditDrawer(employee)}
                          className="text-slate-400 transition hover:text-blue-500"
                          aria-label="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEmployeeToDelete(employee);
                            setDeleteConfirmation('');
                          }}
                          className="text-red-400 transition hover:text-red-600"
                          aria-label="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {showDrawer && (
        <form onSubmit={handleSubmit}>
          <SideDrawer
            title={editingEmployee ? 'تعديل بيانات الموظف' : 'اضافة موظف جديد'}
            icon={<Users className="h-6 w-6" />}
            maxWidth="max-w-3xl"
            onClose={closeDrawer}
            footer={(
              <DrawerFooter
                onCancel={closeDrawer}
                submitLabel={editingEmployee ? 'حفظ التغييرات' : 'أضافة الموظف'}
              />
            )}
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField
                label="اسم الموظف"
                value={formData.name}
                placeholder="فيصل نعمان منذر"
                required
                onChange={(value) => setFormData((current) => ({ ...current, name: value }))}
              />
              <SelectField
                label="دور الحساب"
                value={formData.role}
                options={formRoleOptions}
                onChange={(value) => setFormData((current) => ({ ...current, role: value as EmployeeRoleEnum }))}
              />
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">البريد الالكتروني</label>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-500">أختياري</span>
                </div>
                <input
                  type="email"
                  value={formData.email}
                  placeholder="Faisal@alphabet.com"
                  onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                />
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
              {!editingEmployee && (
                <>
                  <FormField
                    label="كلمة المرور"
                    type="password"
                    value={formData.password}
                    required
                    onChange={(value) => setFormData((current) => ({ ...current, password: value }))}
                  />
                  <FormField
                    label="تأكيد كلمة المرور"
                    type="password"
                    value={formData.confirmPassword}
                    required
                    onChange={(value) => setFormData((current) => ({ ...current, confirmPassword: value }))}
                  />
                </>
              )}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">حالة الحساب</label>
                <button
                  type="button"
                  onClick={() => setFormData((current) => ({
                    ...current,
                    status: current.status === 'active' ? 'inactive' : 'active',
                  }))}
                  className={cn(
                    'flex h-11 w-24 items-center rounded-full p-1 text-xs font-black transition',
                    formData.status === 'active' ? 'justify-start bg-teal-100 text-teal-600' : 'justify-end bg-slate-100 text-slate-500'
                  )}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white shadow">
                    {formData.status === 'active' ? 'نشط' : 'لا'}
                  </span>
                </button>
              </div>
              {!editingEmployee && (
                <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.mustChangePassword}
                    onChange={(event) => setFormData((current) => ({ ...current, mustChangePassword: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-200"
                  />
                  يجب تغيير كلمة المرور
                </label>
              )}
            </div>
          </SideDrawer>
        </form>
      )}

      {showFilters && (
        <SideDrawer
          title="الفلاتر"
          icon={<Users className="h-6 w-6" />}
          maxWidth="max-w-2xl"
          onClose={() => setShowFilters(false)}
          footer={(
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setDraftFilters(defaultFilters);
                  setFilters(defaultFilters);
                  setShowFilters(false);
                  setPage(1);
                }}
                className="h-14 rounded-2xl bg-slate-100 font-black text-slate-600"
              >
                الغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters(draftFilters);
                  setShowFilters(false);
                  setPage(1);
                }}
                className="h-14 rounded-2xl bg-linear-to-l from-violet-700 to-fuchsia-500 font-black text-white shadow-lg shadow-violet-200"
              >
                تطبيق الفلاتر
              </button>
            </div>
          )}
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField
              label="تاريخ الاضافة"
              type="date"
              value={draftFilters.addedAt}
              onChange={(value) => setDraftFilters((current) => ({ ...current, addedAt: value }))}
            />
            <SelectField
              label="اختيار الدور"
              value={draftFilters.role}
              options={[{ value: '', label: 'الكل' }, ...roleOptions.map((item) => ({ value: item.value, label: item.label }))]}
              onChange={(value) => setDraftFilters((current) => ({ ...current, role: value }))}
            />
            <SelectField
              label="حالة الحساب"
              value={draftFilters.status}
              options={[
                { value: 'all', label: 'الكل' },
                { value: 'active', label: 'مفعل' },
                { value: 'inactive', label: 'معطل' },
              ]}
              onChange={(value) => setDraftFilters((current) => ({ ...current, status: value as FiltersState['status'] }))}
            />
          </div>
        </SideDrawer>
      )}

      {employeeToDelete && (
        <ConfirmNameModal
          accent="red"
          title="هل انت متأكد من حذف الموظف"
          description="سوف تقوم بحذف الموظف من النظام ولن تستطيع إعادته مرة أخرى، لتأكيد العملية يرجى كتابة اسم الموظف الكامل والضغط على حذف الموظف"
          confirmLabel="حذف الموظف"
          employee={employeeToDelete}
          value={deleteConfirmation}
          onChange={setDeleteConfirmation}
          onClose={() => {
            setEmployeeToDelete(null);
            setDeleteConfirmation('');
          }}
          onConfirm={handleDelete}
        />
      )}

      {employeeToDisable && (
        <ConfirmNameModal
          accent="orange"
          title="هل انت متأكد من أيقاف الموظف"
          description="سوف تقوم بإيقاف حساب الموظف بشكل مؤقت ويمكنك إعادة تفعيله لاحقاً، لتأكيد العملية يرجى كتابة اسم الموظف الكامل والضغط على إيقاف الحساب"
          confirmLabel="إيقاف الحساب"
          employee={employeeToDisable}
          value={disableConfirmation}
          onChange={setDisableConfirmation}
          onClose={() => {
            setEmployeeToDisable(null);
            setDisableConfirmation('');
          }}
          onConfirm={handleDisable}
        />
      )}
    </div>
  );
};

const RoleCount = ({ label, value, className }: { label: string; value: number; className: string }) => (
  <div className="flex items-center gap-1.5 text-sm font-black text-slate-950" dir="ltr">
    <span className={cn('text-xs font-bold', className)}>{label}</span>
    <span>{value}</span>
  </div>
);

const StatusToggle = ({ active, onClick }: { active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'inline-flex h-9 min-w-[92px] items-center rounded-full px-1 text-xs font-black transition',
      active ? 'justify-start bg-emerald-100 text-emerald-600' : 'justify-end bg-orange-100 text-orange-500'
    )}
  >
    <span className="grid h-7 place-items-center rounded-full bg-white px-3 shadow">
      {active ? 'مفعل' : 'معطل'}
    </span>
  </button>
);

const ConfirmNameModal = ({
  accent,
  title,
  description,
  confirmLabel,
  employee,
  value,
  onChange,
  onClose,
  onConfirm,
}: {
  accent: 'red' | 'orange';
  title: string;
  description: string;
  confirmLabel: string;
  employee: SystemEmployee;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  const canConfirm = value === employee.name;
  const titleColor = accent === 'red' ? 'text-red-600' : 'text-orange-500';
  const buttonColor = accent === 'red' ? 'bg-red-600' : 'bg-orange-500';
  const previewBg = accent === 'red' ? 'bg-red-50' : 'bg-orange-50';

  return (
    <div className="fixed inset-0 z-9999 grid place-items-center bg-black/70 p-6" dir="rtl">
      <div className="w-full max-w-3xl rounded-[2rem] bg-white p-8 text-center shadow-2xl">
        <div className={cn('mx-auto mb-8 flex min-h-44 max-w-sm items-center justify-center rounded-[2rem] p-6', previewBg)}>
          <div className="w-full rounded-3xl bg-white p-5 text-right shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-violet-50 text-violet-600">
                <UserRound className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-black text-slate-950">{employee.name}</p>
                <p className="mt-1 text-sm font-semibold text-violet-600">{getRoleMeta(employee.role).label}</p>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  تاريخ الانشاء {formatDisplayDate(employee.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <h2 className={cn('text-3xl font-black', titleColor)}>{title}</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-600">{description}</p>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={employee.name}
          className="mt-6 h-14 w-full rounded-2xl border border-slate-200 px-5 text-sm font-bold outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
        />
        <div className="mt-8 grid grid-cols-[1fr_2fr] gap-5">
          <button type="button" onClick={onClose} className="h-14 rounded-2xl bg-slate-100 text-lg font-black text-slate-600">
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={cn('h-14 rounded-2xl text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-50', buttonColor)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const isActive = (status?: string) => status === 'active' || status === 'ACTIVE';

const getRoleMeta = (role?: string) => {
  const found = roleOptions.find((item) => item.value === role);
  if (found) return found;
  if (role === 'ADMIN') return { value: 'ADMIN', label: 'أدمن', tone: 'violet' as const };
  return { value: role || '', label: role || 'غير محدد', tone: 'slate' as const };
};

const formatPhone = (phone?: string) => {
  if (!phone) return '-';
  if (phone.startsWith('+')) return phone;
  return `+964 ${phone}`;
};

const formatDisplayDate = (value?: string) => {
  if (!value) return 'Dec 17, 2026';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

const formatDateInput = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

export default Employees;
