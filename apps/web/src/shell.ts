/**
 * QIMA bootstrap shell markup.
 *
 * Traceability:
 * - doc 07 §11.1 Color Roles: semantic design tokens are declared as CSS
 *   custom properties so screens never hardcode visual values.
 * - doc 07 §2 UX North Star: SIMPLE / CLEAR / CALM.
 * - doc 08 §12 Presentation Layer: no business logic lives in presentation.
 *
 * This shell exists to prove the deployment is live. It is not a product screen.
 *
 * The phase label is supplied by the caller from `QIMA_CURRENT_PHASE` rather
 * than hardcoded: a shell that advertises a different phase than the artifact
 * reports at `/api/v1/meta` would misstate the implemented capability
 * (.codex/IMPLEMENTATION_RULES.md §3 Phase Rule).
 */

export interface BootstrapShellProps {
  readonly environment: string;
  readonly apiBasePath: string;
  readonly phase: string;
}

/** Human-readable phase titles defined by doc 10 §24. */
const PHASE_TITLES: Readonly<Record<string, string>> = {
  'phase-0-bootstrap': 'Phase 0 — Project Bootstrap',
  'phase-1-database-foundation': 'Phase 1 — Database Foundation',
  'phase-2-authentication-access': 'Phase 2 — Authentication & Access',
  'phase-3-organization-unit': 'Phase 3 — Organization & Unit',
};

function phaseTitle(phase: string): string {
  return PHASE_TITLES[phase] ?? phase;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderBootstrapShell(props: BootstrapShellProps): string {
  const environment = escapeHtml(props.environment);
  const apiBasePath = escapeHtml(props.apiBasePath);
  const phase = escapeHtml(props.phase);
  const title = escapeHtml(phaseTitle(props.phase));

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QIMA — ${title}</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="/static/tokens.css">
</head>
<body>
<header id="bootstrap-header">
  <p class="label">QIMA Platform</p>
  <h1>${title}</h1>
  <p class="body-large">
    Fondasi organisasi dan unit QIMA aktif dengan otorisasi serta isolasi scope
    yang ditegakkan di server.
  </p>
</header>

<main id="bootstrap-main">
  <section id="runtime-status" aria-labelledby="runtime-status-title">
    <h2 id="runtime-status-title">Runtime</h2>
    <dl>
      <dt>Environment</dt>
      <dd id="environment-value">${environment}</dd>
      <dt>API base path</dt>
      <dd id="api-base-path-value">${apiBasePath}</dd>
      <dt>Phase</dt>
      <dd id="phase-value">${phase}</dd>
    </dl>
  </section>

  <section id="health-status" aria-labelledby="health-status-title">
    <h2 id="health-status-title">Status API</h2>
    <p id="health-output" class="state-loading" role="status" aria-live="polite">Memeriksa…</p>
  </section>

  <section id="phase-scope" aria-labelledby="phase-scope-title">
    <h2 id="phase-scope-title">Cakupan fase ini</h2>
    <ul>
      <li>Struktur repository &amp; workspace</li>
      <li>Skeleton web &amp; API (<code>${apiBasePath}</code>)</li>
      <li>Batas modul domain / shared / config</li>
      <li>Baseline lint, format, type-check, build, test</li>
      <li>Baseline tooling migrasi database</li>
      <li>Skema database: organisasi, unit, site, domain mapping</li>
      <li>Skema akses: user, role, permission, scope assignment</li>
      <li>Skema audit log (append-only) &amp; settings</li>
      <li>Autentikasi, sesi, role, permission, dan scope server-owned</li>
      <li>API organisasi dan unit dengan isolasi lintas organisasi/unit</li>
    </ul>
  </section>
</main>

<footer id="bootstrap-footer">
  <p class="caption">QIMA v0.1.0 — implementasi mengikuti QIMA Master Traceability Matrix v1.0</p>
</footer>

<script src="/static/bootstrap.js"></script>
</body>
</html>`;
}
