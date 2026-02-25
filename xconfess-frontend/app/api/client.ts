export interface TemplateRollout {
  key: string;
  activeVersion: string;
  canaryVersion?: string;
  canaryPercentage: number;
  status: 'healthy' | 'unstable' | 'failed';
  lastValidationFailure?: string;
}

const getApiBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url && process.env.NODE_ENV === 'production') {
    throw new Error("CRITICAL: NEXT_PUBLIC_API_URL is not defined in production.");
  }
  return url || 'http://localhost:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

async function fetchApi<T>(endpoint: string, options: RequestInit = {}, timeoutMs = 15000): Promise<T | null> {
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 204) return null;

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || `API Error: ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

export const rolloutApi = {
  getTemplates: () => fetchApi<TemplateRollout[]>('/admin/templates'),
  updateCanary: (key: string, percentage: number) => 
    fetchApi(`/admin/templates/${key}/canary`, { 
      method: 'PATCH', 
      body: JSON.stringify({ percentage }) 
    }),
  promote: (key: string) => fetchApi(`/admin/templates/${key}/promote`, { method: 'POST' }),
  rollback: (key: string) => fetchApi(`/admin/templates/${key}/rollback`, { method: 'POST' }),
  killSwitch: (key: string) => fetchApi(`/admin/templates/${key}/kill`, { method: 'POST' }),
};