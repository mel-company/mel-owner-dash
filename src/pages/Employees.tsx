import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Pencil, Plus, ShieldCheck, Trash2, UserRound, Users } from 'lucide-react';
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
} from '@/components/dashboard';
import {
  EmployeeRoleEnum,
  systemEmployeesService,
  type CreateEmployeeRequest,
  type SystemEmployee,
} from '../services/systemEmployeesService';

const defaultFormData: CreateEmployeeRequest = {
  name: '',
  email: '',
  phone: '',
  role: EmployeeRoleEnum.EMPLOYEE,
  password: '',
};

const roleOptions = [
  { value: EmployeeRoleEnum.EMPLOYEE, label: 'موظف' },
  { value: EmployeeRoleEnum.SUPPORT, label: 'دعم فني' },
  { value: EmployeeRoleEnum.DEVELOPER, label: 'مطور' },
];

const Employees = () => {
  const [employees, setEmployees] = useState<SystemEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<SystemEmployee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<SystemEmployee | null>(null);
  const [formData, setFormData] = useState<CreateEmployeeRequest>(defaultFormData);
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
    const matchesRole = !roleFilter || employee.role === roleFilter;
    return matchesSearch && matchesRole;
  }), [employees, roleFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleEmployees = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeCount = employees.filter((employee) => isActive(employee.status)).length;

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
      role: employee.role as EmployeeRoleEnum,
      password: '',
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
    try {
      setError('');
      if (editingEmployee) {
        await systemEmployeesService.updateEmployee(editingEmployee.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
        });
      } else {
        await systemEmployeesService.createEmployee(formData);
      }
      closeDrawer();
      fetchEmployees();
    } catch (err) {
      setError(editingEmployee ? 'فشل في تحديث الموظف.' : 'فشل في إنشاء الموظف.');
      console.error('Error saving employee:', err);
    }
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    try {
      setError('');
      await systemEmployeesService.deleteEmployee(employeeToDelete.id);
      setEmployeeToDelete(null);
      fetchEmployees();
    } catch (err) {
      setError('فشل في حذف الموظف. يرجى المحاولة مرة أخرى.');
      console.error('Error deleting employee:', err);
    }
  };

  if (loading && employees.length === 0) return <LoadingState />;

  return (
    <div className="min-h-screen space-y-5 bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="إدارة الموظفين"
        description={<>هناك <span className="font-black text-violet-600">{employees.length} موظف</span> في النظام</>}
        icon={<Users className="h-6 w-6" />}
        action={<PrimaryActionButton onClick={openCreateDrawer}>إضافة موظف<Plus className="h-4 w-4" /></PrimaryActionButton>}
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="إجمالي الموظفين" value={employees.length} icon={<Users />} tone="blue" />
        <StatCard title="الموظفين النشطين" value={activeCount} icon={<ShieldCheck />} tone="teal" />
        <StatCard title="أدوار النظام" value={new Set(employees.map((employee) => employee.role)).size || 0} icon={<UserRound />} tone="violet" />
      </div>

      <SearchFiltersBar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        placeholder="ابحث عن الموظفين"
        filterCount={roleFilter ? 1 : 0}
        onFilterClick={() => {
          setRoleFilter('');
          setPage(1);
        }}
      >
        <select
          value={roleFilter}
          onChange={(event) => {
            setRoleFilter(event.target.value);
            setPage(1);
          }}
          className="h-12 rounded-2xl border border-slate-100 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm outline-none"
        >
          <option value="">كل الأدوار</option>
          {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
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
        {visibleEmployees.length === 0 ? (
          <EmptyState title="لا يوجد موظفين" action={<PrimaryActionButton onClick={openCreateDrawer}>إضافة موظف جديد</PrimaryActionButton>} />
        ) : (
          <table className="w-full min-w-[880px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
                <th className="px-5 py-5 text-right">الموظف</th>
                <th className="px-5 py-5 text-right">البريد الإلكتروني</th>
                <th className="px-5 py-5 text-right">الهاتف</th>
                <th className="px-5 py-5 text-right">الدور</th>
                <th className="px-5 py-5 text-right">الحالة</th>
                <th className="px-5 py-5 text-right">العمليات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleEmployees.map((employee, index) => (
                <tr key={employee.id} className="text-sm text-slate-700 transition hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 font-black text-violet-600">
                        {employee.name.slice(0, 1)}
                      </div>
                      <span className="font-black text-slate-950">{employee.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-600">{employee.email}</td>
                  <td className="px-5 py-4 text-slate-600">{employee.phone || '-'}</td>
                  <td className="px-5 py-4"><StatusPill tone="violet">{getRoleText(employee.role as EmployeeRoleEnum)}</StatusPill></td>
                  <td className="px-5 py-4"><StatusPill tone={isActive(employee.status) ? 'green' : 'slate'}>{isActive(employee.status) ? 'نشط' : 'غير نشط'}</StatusPill></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setEmployeeToDelete(employee)} className="text-red-400 transition hover:text-red-600" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>
                      <button onClick={() => openEditDrawer(employee)} className="text-slate-400 transition hover:text-blue-500" aria-label="تعديل"><Pencil className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableShell>

      {showDrawer && (
        <form onSubmit={handleSubmit}>
          <SideDrawer
            title={editingEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
            icon={<Users className="h-6 w-6" />}
            onClose={closeDrawer}
            footer={<DrawerFooter onCancel={closeDrawer} submitLabel={editingEmployee ? 'حفظ التغييرات' : 'إضافة الموظف'} />}
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField label="اسم الموظف" value={formData.name} required onChange={(value) => setFormData((current) => ({ ...current, name: value }))} />
              <FormField label="البريد الإلكتروني" type="email" value={formData.email} required onChange={(value) => setFormData((current) => ({ ...current, email: value }))} />
              <FormField label="رقم الهاتف" value={formData.phone} onChange={(value) => setFormData((current) => ({ ...current, phone: value }))} />
              <SelectField label="الدور" value={formData.role} options={roleOptions} onChange={(value) => setFormData((current) => ({ ...current, role: value as EmployeeRoleEnum }))} />
              {!editingEmployee && (
                <FormField label="كلمة المرور" type="password" value={formData.password} required onChange={(value) => setFormData((current) => ({ ...current, password: value }))} />
              )}
            </div>
          </SideDrawer>
        </form>
      )}

      {employeeToDelete && (
        <ConfirmDeleteModal
          title="هل أنت متأكد من حذف الموظف؟"
          description={`سيتم حذف ${employeeToDelete.name} من النظام ولا يمكن التراجع عن العملية.`}
          confirmLabel="حذف الموظف"
          onClose={() => setEmployeeToDelete(null)}
          onConfirm={handleDelete}
          preview={(
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <UserRound className="mx-auto mb-4 h-12 w-12 text-red-500" />
              <p className="text-xl font-black text-slate-950">{employeeToDelete.name}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">{employeeToDelete.email}</p>
            </div>
          )}
        />
      )}
    </div>
  );
};

const isActive = (status?: string) => status === 'active' || status === 'ACTIVE';

const getRoleText = (role?: EmployeeRoleEnum) => {
  const roleMap: Record<EmployeeRoleEnum, string> = {
    [EmployeeRoleEnum.EMPLOYEE]: 'موظف',
    [EmployeeRoleEnum.SUPPORT]: 'دعم فني',
    [EmployeeRoleEnum.DEVELOPER]: 'مطور',
  };
  return role ? roleMap[role] || role : 'غير محدد';
};

export default Employees;
