/**
 * QIMA deployment entry point (Cloudflare Pages / Workers).
 *
 * Traceability:
 * - doc 08 §2 Implementation Principle: ONE REPOSITORY / ONE APPLICATION SYSTEM
 *   with a modular internal architecture. `apps/web` and `apps/api` remain
 *   separate module boundaries; this file only composes them for deployment.
 * - doc 05 §11 API Layer: the API is mounted under `/api/v1`.
 * - .agents/genspark/GENSPARK_DEPLOYMENT_SPEC.md: Cloudflare deployment target.
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { api } from '../apps/api/src/app';
import type { QimaBindings } from '../apps/api/src/bindings';
import { web } from '../apps/web/src/app';
import { ERROR_STATUS, failure } from '@qima/shared';

const app = new Hono<{ Bindings: QimaBindings }>();

/**
 * Terminal error boundary (doc 08 §12, doc 05 §"Internal stack traces").
 *
 * Implemented as middleware, not only via `app.onError`: the Cloudflare Pages
 * plugin mounts this app with `worker.route('/', app)`, which copies routes and
 * middleware but NOT the error handler, so an `onError`-only boundary is absent
 * from the deployed artifact. Registered first so it wraps every downstream
 * handler.
 *
 * Internal details are never forwarded to the client.
 */
app.use('*', async (c, next) => {
  try {
    await next();
  } catch {
    return c.json(
      failure('INTERNAL_ERROR', 'Unexpected server error.'),
      ERROR_STATUS.INTERNAL_ERROR,
    );
  }
});

// API transport boundary. Mounted first so API routes never fall through
// to the presentation surface.
app.route('/api/v1', api);

// Presentation surface.
app.route('/', web);

/**
 * Terminal not-found boundary (doc 08 §12 Error Handling Rule).
 *
 * Every request must be finalized by the application itself. An unmatched route
 * that leaves the Hono context unfinalized is surfaced by the Cloudflare Pages
 * worker wrapper as an opaque HTTP 500 ("Context is not finalized") instead of
 * a correct 404.
 *
 * Any path under the API base path — including an unversioned `/api/*` call —
 * is answered with the JSON envelope so an API client never receives HTML.
 */
function notFoundResponse(c: Context<{ Bindings: QimaBindings }>): Response {
  const isApiPath = c.req.path === '/api' || c.req.path.startsWith('/api/');

  return c.json(
    failure('NOT_FOUND', isApiPath ? 'API route not found.' : 'Resource not found.'),
    ERROR_STATUS.NOT_FOUND,
  );
}

/**
 * The boundary is registered TWICE, deliberately — both registrations are load
 * bearing and neither is redundant:
 *
 * 1. `app.all('*')` — a real terminal route. The Cloudflare Pages plugin mounts
 *    this app into its own generated worker via `worker.route('/', app)`, which
 *    copies routes only. It then tries to forward the not-found handler with
 *    `worker.notFound(app.notFoundHandler)`, but `notFoundHandler` is a private
 *    field in Hono 4.x, so that reads `undefined` and the outer worker is left
 *    with NO not-found handler. A registered wildcard route is therefore the
 *    only form of the boundary that survives into the deployed artifact.
 * 2. `app.notFound()` — keeps this app correct as a standalone Hono
 *    application, independent of how any host wrapper composes it.
 */
app.all('*', notFoundResponse);
app.notFound(notFoundResponse);

/**
 * Standalone error handler. Complements the middleware boundary above for the
 * case where this app is used directly rather than mounted by a host wrapper.
 */
app.onError((_error, c) =>
  c.json(failure('INTERNAL_ERROR', 'Unexpected server error.'), ERROR_STATUS.INTERNAL_ERROR),
);

export default app;
