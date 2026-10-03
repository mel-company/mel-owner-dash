import axiosInstance from '../utils/AxiosInstance';

// Employee Role Enum — must match SystemUserRoleEnum on the API
export const EmployeeRoleEnum = {
  OWNER: 'OWNER',
  EMPLOYEE: 'EMPLOYEE',
  DEVELOPER: 'DEVELOPER',
  SUPPORT: 'SUPPORT',
} as const;

export type EmployeeRoleEnum = typeof EmployeeRoleEnum[keyof typeof EmployeeRoleEnum];

export interface SystemEmployee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  status?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeesListResponse {
  data: SystemEmployee[];
  total: number;
  page?: number;
  limit?: number;
}

export interface CreateEmployeeRequest {
  name: string;
  email: string;
  phone?: string;
  role?: EmployeeRoleEnum;
  password?: string;
}

export interface UpdateEmployeeRequest {
  name?: string;
  email?: string;
  phone?: string;
  role?: EmployeeRoleEnum | string;
  status?: string;
}

export interface SearchEmployeesParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'OWNER' | 'EMPLOYEE' | 'DEVELOPER' | 'SUPPORT';
  status?: string;
}

const VALID_ROLES = new Set(['OWNER', 'EMPLOYEE', 'DEVELOPER', 'SUPPORT']);

const sanitizeRole = (role?: string): EmployeeRoleEnum | undefined => {
  if (role == null || role === '') return undefined;
  const raw = role.trim().toUpperCase();
  if (raw === 'ADMIN') return EmployeeRoleEnum.OWNER;
  if (VALID_ROLES.has(raw)) return raw as EmployeeRoleEnum;
  return undefined;
};

/**
 * System Employees Service
 * Handles system employee management endpoints
 */
export const systemEmployeesService = {
  /**
   * إنشاء موظف جديد
   * POST /api/v1/system-employee
   */
  createEmployee: async (employeeData: CreateEmployeeRequest): Promise<SystemEmployee> => {
    const role = sanitizeRole(employeeData.role) ?? EmployeeRoleEnum.EMPLOYEE;
    const response = await axiosInstance.post<SystemEmployee>(
      '/system-employee',
      { ...employeeData, role }
    );
    return response as unknown as SystemEmployee;
  },

  /**
   * الحصول على جميع الموظفين
   * GET /api/v1/system-employee
   */
  getAllEmployees: async (params?: SearchEmployeesParams): Promise<EmployeesListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.status) queryParams.append('status', params.status);

    const queryString = queryParams.toString();
    const url = `/system-employee${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get<EmployeesListResponse>(url);
    return response as unknown as EmployeesListResponse;
  },

  /**
   * البحث في الموظفين
   * GET /api/v1/system-employee/search
   */
  searchEmployees: async (params: SearchEmployeesParams): Promise<EmployeesListResponse> => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.role) queryParams.append('role', params.role);
    if (params.status) queryParams.append('status', params.status);

    const queryString = queryParams.toString();
    const url = `/system-employee/search${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get<EmployeesListResponse>(url);
    return response as unknown as EmployeesListResponse;
  },

  /**
   * الحصول على موظف محدد
   * GET /api/v1/system-employee/{id}
   */
  getEmployeeById: async (id: string): Promise<SystemEmployee> => {
    const response = await axiosInstance.get<SystemEmployee>(
      `/system-employee/${id}`
    );
    return response as unknown as SystemEmployee;
  },

  /**
   * تحديث موظف
   * PUT /api/v1/system-employee/{id}
   */
  updateEmployee: async (id: string, employeeData: UpdateEmployeeRequest): Promise<SystemEmployee> => {
    const payload: UpdateEmployeeRequest = { ...employeeData };
    if ('role' in payload) {
      const role = sanitizeRole(payload.role);
      if (role) payload.role = role;
      else delete payload.role;
    }
    const response = await axiosInstance.put<SystemEmployee>(
      `/system-employee/${id}`,
      payload
    );
    return response as unknown as SystemEmployee;
  },

  /**
   * حذف موظف (soft delete)
   * DELETE /api/v1/system-employee/{id}
   */
  deleteEmployee: async (id: string): Promise<void> => {
    await axiosInstance.delete<void>(`/system-employee/${id}`);
  },
};
