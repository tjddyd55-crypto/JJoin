import { createApiClient, type ApiClient } from '@jjoin/api-client';

export const ADMIN_TOKEN_KEY = 'jjoin_admin_token';
export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';

export class ApiError extends Error {
  readonly status: number;
  readonly bodySnippet: string;

  constructor(status: number, bodySnippet: string) {
    super(bodySnippet ? `${status}: ${bodySnippet}` : String(status));
    this.name = 'ApiError';
    this.status = status;
    this.bodySnippet = bodySnippet;
  }
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof Error) {
    const match = err.message.match(/^api_error:(\d+):(.*)$/);
    if (match) {
      return new ApiError(Number(match[1]), match[2] ?? '');
    }
    const legacy = err.message.match(/^(\d+):(.*)$/);
    if (legacy) {
      return new ApiError(Number(legacy[1]), legacy[2] ?? '');
    }
    if (err.message.startsWith('network_error:')) {
      return new ApiError(0, err.message);
    }
    return new ApiError(0, err.message);
  }
  return new ApiError(0, 'unknown_error');
}

function wrapClient(client: ApiClient): ApiClient {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver) as unknown;
      if (typeof value !== 'function') return value;
      return async (...args: unknown[]) => {
        try {
          return await (value as (...a: unknown[]) => Promise<unknown>).apply(target, args);
        } catch (err) {
          const apiErr = toApiError(err);
          if (apiErr.status === 401) {
            clearAdminToken();
            unauthorizedHandler?.();
          }
          throw apiErr;
        }
      };
    },
  });
}

export const api: ApiClient = wrapClient(
  createApiClient({
    baseUrl: API_BASE,
    getAccessToken: getAdminToken,
  }),
);
