export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  accessToken?: string;
  user?: any;
  [key: string]: any;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function getStoredTenantId(): string {
  if (typeof window === 'undefined') return 'tenant-pishro';
  return localStorage.getItem('tenant_id') || 'tenant-pishro';
}

export function getStoredCompanyId(): string {
  if (typeof window === 'undefined') return 'comp-pishro-1';
  return localStorage.getItem('company_id') || 'comp-pishro-1';
}

export function getStoredBranchId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('branch_id');
}

export function getStoredFiscalYearId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fiscal_year_id');
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getStoredToken();
  const tenantId = getStoredTenantId();
  const companyId = getStoredCompanyId();
  const branchId = getStoredBranchId();
  const fiscalYearId = getStoredFiscalYearId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
    'x-company-id': companyId,
    ...(branchId ? { 'x-branch-id': branchId } : {}),
    ...(fiscalYearId ? { 'x-fiscal-year-id': fiscalYearId } : {}),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/login';
      }
    }
    throw new Error(json.message || `خطای سرور: ${response.status}`);
  }

  return json;
}

const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input: string | number | bigint | null | undefined): string {
  if (input === null || input === undefined || input === '') return '';
  return input
    .toString()
    .replace(/[0-9]/g, (char) => farsiDigits[parseInt(char, 10)])
    .replace(/[٠-٩]/g, (char) => farsiDigits[char.charCodeAt(0) - 1632]);
}

// قالب‌بندی ارقام پولی با جداکننده سه‌رقمی فارسی و ارقام قطعی فارسی
export function formatMoney(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') return '۰';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '۰';
  const formatted = num.toLocaleString('fa-IR');
  return toPersianDigits(formatted);
}
