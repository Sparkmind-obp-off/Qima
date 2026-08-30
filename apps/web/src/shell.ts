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
 */

export interface BootstrapShellProps {
  readonly environment: string;
  readonly apiBasePath: string;
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

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QIMA — Phase 0 Bootstrap</title>
<link rel="stylesheet" href="/static/tokens.css">
</head>
<body>
<header id="bootstrap-header">
  <p class="label">QIMA Platform</p>
  <h1>Phase 0 — Project Bootstrap</h1>
  <p class="body-large">
    Fondasi engineering QIMA aktif. Modul produk belum diimplementasikan pada fase ini.
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
