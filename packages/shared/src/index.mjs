export function success(data) {
  return Object.freeze({ ok: true, data });
}

export function failure(code, message) {
  return Object.freeze({ ok: false, error: Object.freeze({ code, message }) });
}
