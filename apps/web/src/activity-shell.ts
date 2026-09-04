export interface ActivityShellProps {
  readonly mode: 'list' | 'create' | 'detail' | 'edit';
  readonly activityId?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderActivityShell(props: ActivityShellProps): string {
  const activityId = escapeHtml(props.activityId ?? '');
  return `<!DOCTYPE html>
<html lang="id" data-activity-mode="${props.mode}" data-activity-id="${activityId}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Activity — QIMA</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="/static/tokens.css">
</head>
<body class="program-page activity-page">
<header class="app-header">
  <a href="/" class="brand-link">QIMA</a>
  <nav aria-label="Navigasi utama"><a href="/programs">Programs</a> <a href="/activities" aria-current="page">Activities</a></nav>
</header>
<main id="activity-main" class="program-layout">
  <section aria-labelledby="scope-title" class="panel">
    <h1 id="scope-title">Activity Management</h1>
    <p class="body-large">Kelola kegiatan dalam scope organisasi, unit, dan Program yang diverifikasi server.</p>
    <form id="scope-form" class="form-grid">
      <label>Access token<input id="access-token" type="password" autocomplete="off" required></label>
      <label>Organization ID<input id="organization-id" autocomplete="off" required></label>
      <label>Unit ID<input id="unit-id" autocomplete="off" required></label>
      <button type="submit">Gunakan scope</button>
    </form>
  </section>
  <section id="activity-content" class="panel" aria-live="polite">
    <p id="activity-state" class="state-loading">Masukkan akses dan scope untuk memuat Activity.</p>
  </section>
</main>
<footer id="bootstrap-footer"><p class="caption">QIMA Phase 5 — Activity</p></footer>
<script src="/static/activities.js"></script>
</body>
</html>`;
}
