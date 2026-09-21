import { API_URL } from '@/lib/config';
import { useSession } from '@/state/session';

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, unknown>;
  retryAfter?: number;

  constructor(status: number, code: string, message: string, fields?: Record<string, unknown>, retryAfter?: number) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.retryAfter = retryAfter;
  }

  /** The first field error, for forms. */
  fieldMessage(field?: string): string | undefined {
    const raw = field ? this.fields?.[field] : this.fields && Object.values(this.fields)[0];
    if (Array.isArray(raw)) return String(raw[0]);
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw === 'object') return String(Object.values(raw)[0]);
    return undefined;
  }

  get isNetwork() {
    return this.status === 0;
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
  auth?: boolean;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const { refresh, setTokens } = useSession.getState();
      if (!refresh) return false;
      try {
        const response = await fetch(`${API_URL}/auth/token/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refresh }),
        });
        if (!response.ok) return false;
        const data = (await response.json()) as { access: string; refresh?: string };
        await setTokens(data.access, data.refresh ?? refresh);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

function toError(status: number, data: unknown): ApiError {
  const error = (data as { error?: { code?: string; message?: string; fields?: Record<string, unknown>; retry_after_seconds?: number } })
    ?.error;
  if (error) {
    return new ApiError(status, error.code ?? 'error', error.message || 'Something went wrong.', error.fields, error.retry_after_seconds);
  }
  return new ApiError(status, 'error', status >= 500 ? 'The server had a problem. Please try again.' : 'Something went wrong.');
}

export async function request<T>(path: string, options: Options = {}): Promise<T> {
  const { method = 'GET', body, form, auth = true, idempotencyKey, signal } = options;

  const buildHeaders = () => {
    const session = useSession.getState();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (auth && session.access) headers.Authorization = `Bearer ${session.access}`;
    if (auth && session.schoolId) headers['X-School-Id'] = session.schoolId;
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    if (body !== undefined && !form) headers['Content-Type'] = 'application/json';
    return headers;
  };
  const payload = form ?? (body !== undefined ? JSON.stringify(body) : undefined);

  const send = () => fetch(`${API_URL}${path}`, { method, headers: buildHeaders(), body: payload, signal });

  let response: Response;
  try {
    response = await send();
    if (response.status === 401 && auth && useSession.getState().refresh) {
      if (await refreshTokens()) {
        response = await send();
      } else {
        await useSession.getState().signOut();
      }
    }
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error;
    throw new ApiError(0, 'network', "You're offline or the server can't be reached. We'll keep trying.");
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) throw toError(response.status, data);
  return data as T;
}

export const http = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown, extra: Omit<Options, 'method' | 'body'> = {}) =>
    request<T>(path, { method: 'POST', body: body ?? {}, ...extra }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ?? {} }),
  del: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', form }),
};
