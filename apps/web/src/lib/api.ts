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

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getStoredToken();
  const tenantId = getStoredTenantId();
  const companyId = getStoredCompanyId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
    'x-company-id': companyId,
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
    throw new Error(json.message || `خطای سرور: ${response.status}`);
  }

  return json;
}

// قالب‌بندی ارقام پولی با جداکننده سه‌رقمی فارسی
export function formatMoney(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') return '۰';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '۰';
  return num.toLocaleString('fa-IR');
}
