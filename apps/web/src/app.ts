/**
 * QIMA web surface — Phase 0 skeleton.
 *
 * Traceability:
 * - Phase 0 task T0.03 (Configure web application) — doc 10 §24.
 * - doc 08 §5 Application Boundary: `apps/web` owns presentation only.
 * - doc 07 §11 Design Token System: semantic tokens, no hardcoded visual values.
 *
 * Phase 0 boundary: this is the infrastructure-required shell ONLY. The screen
 * inventory in doc 07 (public site, admin application, dashboards) belongs to
 * Phase 3+ and is deliberately NOT implemented here
 * (.codex/PHASE_0_EXECUTION_SCOPE.md §4 Explicit Non-Goals).
 */

import { Hono } from 'hono';
import { loadQimaConfig } from '@qima/config';
import type { QimaBindings } from '../../api/src/bindings';
import { renderBootstrapShell } from './shell';

export const web = new Hono<{ Bindings: QimaBindings }>();

web.get('/', (c) => {
  const config = loadQimaConfig(c.env as unknown as Record<string, string | undefined>);

  return c.html(
    renderBootstrapShell({
      environment: config.appEnv,
      apiBasePath: config.apiBasePath,
    }),
  );
});
