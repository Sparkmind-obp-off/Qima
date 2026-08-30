export interface ApiSuccess<T> {
  readonly ok: true;
  readonly data: T;
}

export interface ApiFailure {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function success<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function failure(code: string, message: string): ApiFailure {
  return { ok: false, error: { code, message } };
}
