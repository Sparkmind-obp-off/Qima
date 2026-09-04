export interface ProgramShellProps {
  readonly mode: 'list' | 'create' | 'detail' | 'edit';
  readonly programId?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderProgramShell(props: ProgramShellProps): string {
  const programId = escapeHtml(props.programId ?? '');
  return `<!DOCTYPE html>
<html lang="id" data-program-mode="${props.mode}" data-program-id="${programId}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Program — QIMA</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="/static/tokens.css">
</head>
<body class="program-page">
<header class="app-header">
  <a href="/" class="brand-link">QIMA</a>
  <nav aria-label="Navigasi utama"><a href="/programs" aria-current="page">Programs</a></nav>
</header>
<main id="program-main" class="program-layout">
  <section aria-labelledby="scope-title" class="panel">
    <h1 id="scope-title">Program Management</h1>
    <p class="body-large">Kelola program hanya dalam scope organisasi dan unit yang diizinkan server.</p>
    <form id="scope-form" class="form-grid">
      <label>Access token<input id="access-token" type="password" autocomplete="off" required></label>
      <label>Organization ID<input id="organization-id" autocomplete="off" required></label>
      <label>Unit ID<input id="unit-id" autocomplete="off" required></label>
      <button type="submit">Gunakan scope</button>
    </form>
  </section>
  <section id="program-content" class="panel" aria-live="polite">
    <p id="program-state" class="state-loading">Masukkan akses dan scope untuk memuat program.</p>
  </section>
</main>
<footer id="bootstrap-footer"><p class="caption">QIMA Phase 4 — Program Foundation</p></footer>
<script src="/static/programs.js"></script>
</body>
</html>`;
}
