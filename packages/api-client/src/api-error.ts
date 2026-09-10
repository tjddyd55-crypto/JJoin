export type ParsedApiErrorBody = {
  code: string | null;
  message: string | null;
  details: unknown;
};

export function parseApiErrorBody(text: string): ParsedApiErrorBody {
  try {
    const body = JSON.parse(text) as {
      message?: string | { code?: string; message?: string; [key: string]: unknown };
    };
    if (typeof body.message === 'string') {
      return { code: body.message, message: body.message, details: body };
    }
    if (body.message && typeof body.message === 'object') {
      return {
        code: typeof body.message.code === 'string' ? body.message.code : null,
        message: typeof body.message.message === 'string' ? body.message.message : null,
        details: body.message,
      };
    }
  } catch {
    /* non-json */
  }
  return { code: null, message: null, details: null };
}

/** Structured HTTP error from API — preserves status/code for client mapping. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly apiMessage: string | null;
  readonly details: unknown;
  readonly rawBody: string;

  constructor(status: number, rawBody: string) {
    const parsed = parseApiErrorBody(rawBody);
    const label = parsed.code ?? parsed.message ?? rawBody.replace(/\s+/g, ' ').slice(0, 120);
    super(`api_error:${status}:${label}`);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = parsed.code;
    this.apiMessage = parsed.message;
    this.details = parsed.details;
    this.rawBody = rawBody;
  }
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}
