/**
 * QIMA web surface — infrastructure shell.
 *
 * Traceability:
 * - Phase 0 task T0.03 (Configure web application) — doc 10 §24.
 * - doc 08 §5 Application Boundary: `apps/web` owns presentation only.
 * - doc 07 §11 Design Token System: semantic tokens, no hardcoded visual values.
 *
 * Phase boundary: this is the infrastructure-required shell ONLY. The screen
 * inventory in doc 07 (public site, admin application, dashboards) belongs to
 * Phase 3+ and is deliberately NOT implemented here. Phase 1 is a database
 * foundation phase (doc 10 §24) and introduces no product screens.
 */

import { Hono } from 'hono';
import { loadQimaConfig } from '@qima/config';
import type { QimaBindings } from '../../api/src/bindings';
import { QIMA_CURRENT_PHASE } from '../../api/src/phase';
import { renderActivityShell } from './activity-shell';
import { renderParticipantShell } from './participant-shell';
import { renderProgramShell } from './program-shell';
import { renderBootstrapShell } from './shell';

export const web = new Hono<{ Bindings: QimaBindings }>();

web.get('/programs', (c) => c.html(renderProgramShell({ mode: 'list' })));
web.get('/programs/new', (c) => c.html(renderProgramShell({ mode: 'create' })));
web.get('/programs/:programId/edit', (c) =>
  c.html(renderProgramShell({ mode: 'edit', programId: c.req.param('programId') })),
);
web.get('/programs/:programId', (c) =>
  c.html(renderProgramShell({ mode: 'detail', programId: c.req.param('programId') })),
);

web.get('/activities', (c) => c.html(renderActivityShell({ mode: 'list' })));
web.get('/activities/new', (c) => c.html(renderActivityShell({ mode: 'create' })));
web.get('/activities/:activityId/edit', (c) =>
  c.html(renderActivityShell({ mode: 'edit', activityId: c.req.param('activityId') })),
);
web.get('/activities/:activityId', (c) =>
  c.html(renderActivityShell({ mode: 'detail', activityId: c.req.param('activityId') })),
);

web.get('/participants', (c) => c.html(renderParticipantShell({ mode: 'list' })));
web.get('/participants/new', (c) => c.html(renderParticipantShell({ mode: 'create' })));
web.get('/participants/:participantId/edit', (c) =>
  c.html(renderParticipantShell({ mode: 'edit', participantId: c.req.param('participantId') })),
);
web.get('/participants/:participantId', (c) =>
  c.html(renderParticipantShell({ mode: 'detail', participantId: c.req.param('participantId') })),
);

web.get('/', (c) => {
  const config = loadQimaConfig(c.env as unknown as Record<string, string | undefined>);

  return c.html(
    renderBootstrapShell({
      environment: config.appEnv,
      apiBasePath: config.apiBasePath,
      phase: QIMA_CURRENT_PHASE,
    }),
  );
});
