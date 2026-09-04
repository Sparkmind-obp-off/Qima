export interface ParticipantShellProps {
  readonly mode: 'list' | 'create' | 'detail' | 'edit';
  readonly participantId?: string;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderParticipantShell(props: ParticipantShellProps): string {
  const participantId = escapeHtml(props.participantId ?? '');
  return `<!DOCTYPE html>
<html lang="id" data-participant-mode="${props.mode}" data-participant-id="${participantId}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Participant — QIMA</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="/static/tokens.css">
</head>
<body class="program-page participant-page">
<header class="app-header">
  <a href="/" class="brand-link">QIMA</a>
  <nav aria-label="Navigasi utama"><a href="/programs">Programs</a> <a href="/activities">Activities</a> <a href="/participants" aria-current="page">Participants</a></nav>
</header>
<main id="participant-main" class="program-layout">
  <section aria-labelledby="scope-title" class="panel">
    <h1 id="scope-title">Participant Management</h1>
    <p class="body-large">Kelola data Peserta hanya dalam scope organisasi dan unit yang diverifikasi server.</p>
    <form id="scope-form" class="form-grid">
      <label>Access token<input id="access-token" type="password" autocomplete="off" required></label>
      <label>Organization ID<input id="organization-id" autocomplete="off" required></label>
      <label>Unit ID<input id="unit-id" autocomplete="off" required></label>
      <button type="submit">Gunakan scope</button>
    </form>
  </section>
  <section id="participant-content" class="panel" aria-live="polite">
    <p id="participant-state" class="state-loading">Masukkan akses dan scope untuk memuat Peserta.</p>
  </section>
</main>
<footer id="bootstrap-footer"><p class="caption">QIMA Phase 6 — Participant</p></footer>
<script src="/static/participants.js"></script>
</body>
</html>`;
}
