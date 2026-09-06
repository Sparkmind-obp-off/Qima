export function renderPrototypeAdminShell() {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="Admin demo QIMA untuk simulasi operasional unit pendidikan Al-Qur'an.">
  <title>QIMA — Admin Demo</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22><rect width=%2264%22 height=%2264%22 rx=%2218%22 fill=%22%23176b56%22/><text x=%2232%22 y=%2243%22 text-anchor=%22middle%22 font-size=%2236%22 fill=%22white%22>ق</text></svg>">
  <link rel="stylesheet" href="/static/prototype.css">
  <link rel="stylesheet" href="/static/prototype-flow.css">
</head>
<body class="admin-demo">
<a class="skip-link" href="#admin-content">Lewati ke konten utama</a>
<div class="demo-mode-bar demo-mode-bar-admin" role="note" aria-label="Status admin demo"><span class="demo-indicator" aria-hidden="true"></span><strong>ADMIN DEMO</strong><span>Data operasional statis · tidak terhubung ke production</span><a href="/demo">Kembali ke Public <span aria-hidden="true">↗</span></a></div>
<div class="admin-layout">
  <aside class="admin-sidebar" id="admin-sidebar" aria-label="Navigasi admin">
    <a class="brand" href="/demo"><span class="brand-mark" aria-hidden="true">Q</span><span><strong>QIMA</strong><small>ADMIN DEMO</small></span></a>
    <div class="admin-unit"><small>UNIT CONTEXT</small><button id="admin-unit-switcher" type="button" aria-haspopup="dialog" aria-expanded="false"><span data-admin-unit-short>RQ Blumbang</span><span aria-hidden="true">⌄</span></button><p>Satu core, konteks unit terpisah.</p></div>
    <nav class="admin-nav" aria-label="Modul admin">
      <button class="active" type="button" data-view="dashboard" aria-current="page"><span class="nav-icon" aria-hidden="true">⌂</span><span>Dashboard</span></button>
      <button type="button" data-view="programs"><span class="nav-icon" aria-hidden="true">▣</span><span>Program</span></button>
      <button type="button" data-view="activities"><span class="nav-icon" aria-hidden="true">◷</span><span>Aktivitas</span></button>
      <button type="button" data-view="registrations"><span class="nav-icon" aria-hidden="true">✓</span><span>Pendaftaran</span><b aria-label="8 pendaftaran perlu ditinjau">8</b></button>
      <button type="button" data-view="participants"><span class="nav-icon" aria-hidden="true">◎</span><span>Peserta</span></button>
    </nav>
    <div class="admin-sidebar-bottom"><button type="button" data-toast="Pengaturan branding akan terhubung pada fase production."><span aria-hidden="true">⚙</span><span>Pengaturan</span></button><a href="/demo"><span aria-hidden="true">↩</span><span>Kembali ke Public</span></a></div>
  </aside>
  <button class="sidebar-scrim" id="sidebar-scrim" type="button" aria-label="Tutup navigasi" hidden></button>
  <main class="admin-main" id="admin-content">
    <header class="admin-topbar"><button id="admin-menu" class="admin-menu" type="button" aria-label="Buka navigasi admin" aria-controls="admin-sidebar" aria-expanded="false"><span aria-hidden="true">☰</span></button><div><small>UNIT AKTIF</small><strong id="admin-unit-label">Rumah Qur'an Blumbang</strong></div><span class="demo-data-chip">DATA DEMO</span><div class="admin-user"><span class="avatar" aria-hidden="true">AD</span><span><strong>Admin Demo</strong><small>Administrator simulasi</small></span></div></header>
    <section id="admin-dashboard" class="admin-view" aria-labelledby="dashboard-title">
      <div class="admin-heading"><div><span class="eyebrow">RINGKASAN OPERASIONAL</span><h1 id="dashboard-title">Selamat datang, Admin.</h1><p>Gambaran demo aktivitas <span data-admin-unit-name>Rumah Qur'an Blumbang</span> hari ini.</p></div><button class="admin-primary" type="button" data-view-target="programs">Lihat Program <span aria-hidden="true">→</span></button></div>
      <div class="context-callout"><div><span class="context-icon" aria-hidden="true">◎</span><span><small>Anda sedang melihat</small><strong data-admin-unit-name>Rumah Qur'an Blumbang</strong></span></div><p>Semua angka di halaman ini adalah data presentasi, bukan metrik production.</p><button type="button" id="context-switch-action">Ganti unit</button></div>
      <div class="stat-grid" aria-label="Metrik demo"><article><span class="stat-icon" aria-hidden="true">◎</span><small>Peserta Aktif</small><strong>128</strong><span class="stat-note positive">↑ 12% bulan ini</span></article><article><span class="stat-icon" aria-hidden="true">▣</span><small>Program Berjalan</small><strong>6</strong><span class="stat-note">2 akan dimulai</span></article><article><span class="stat-icon" aria-hidden="true">✓</span><small>Pendaftaran Baru</small><strong>24</strong><span class="stat-note attention">8 perlu ditinjau</span></article><article><span class="stat-icon" aria-hidden="true">◷</span><small>Aktivitas Bulan Ini</small><strong>14</strong><span class="stat-note">4 agenda terdekat</span></article></div>
      <div class="admin-grid"><article class="admin-panel"><div class="panel-head"><div><span class="eyebrow">PENDAFTARAN TERBARU</span><h2>Perlu perhatian Anda</h2></div><button type="button" data-view-target="registrations">Lihat semua <span aria-hidden="true">→</span></button></div><div class="data-list"><div><span class="avatar mini" aria-hidden="true">AR</span><div><strong>Ahmad Rizky</strong><small>Tahsin & Tahfidz</small></div><em class="status pending">Menunggu</em></div><div><span class="avatar mini" aria-hidden="true">NA</span><div><strong>Nabila Aulia</strong><small>Kelas Qur'an Anak</small></div><em class="status approved">Diterima</em></div><div><span class="avatar mini" aria-hidden="true">FH</span><div><strong>Fajar Hidayat</strong><small>Tahsin & Tahfidz</small></div><em class="status approved">Diterima</em></div><div><span class="avatar mini" aria-hidden="true">SR</span><div><strong>Siti Rahma</strong><small>Kajian Qur'ani</small></div><em class="status pending">Menunggu</em></div></div></article>
      <article class="admin-panel"><div class="panel-head"><div><span class="eyebrow">AGENDA TERDEKAT</span><h2>Berikutnya di unit</h2></div><button type="button" data-view-target="activities">Semua agenda <span aria-hidden="true">→</span></button></div><div class="agenda"><div><time datetime="2026-09-07">07</time><span><b>Setoran Hafalan</b><small>07 Sep · 16.00 WIB</small></span></div><div><time datetime="2026-09-10">10</time><span><b>Kelas Qur'an Anak</b><small>10 Sep · 15.30 WIB</small></span></div><div><time datetime="2026-09-14">14</time><span><b>Kajian Qur'ani</b><small>14 Sep · 19.30 WIB</small></span></div></div></article></div>
      <article class="admin-panel"><div class="panel-head"><div><span class="eyebrow">PROGRAM AKTIF</span><h2>Performa program unit</h2></div><button type="button" data-view-target="programs">Kelola program <span aria-hidden="true">→</span></button></div><div class="program-admin-grid"><div><strong>Tahsin & Tahfidz</strong><span>42 peserta · Aktif</span><div class="progress-track"><i style="width:68%"></i></div><b>68% kapasitas</b></div><div><strong>Kelas Qur'an Anak</strong><span>31 peserta · Aktif</span><div class="progress-track"><i style="width:54%"></i></div><b>54% kapasitas</b></div><div><strong>Kajian Qur'ani</strong><span>55 peserta · Aktif</span><div class="progress-track"><i style="width:82%"></i></div><b>82% kapasitas</b></div></div></article>
    </section>
    <section id="admin-table-view" class="admin-view" aria-live="polite" hidden></section>
  </main>
</div>
<div id="admin-unit-modal" class="admin-modal-backdrop" hidden><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="admin-unit-title"><button class="modal-close" id="admin-unit-close" type="button" aria-label="Tutup pemilih unit">×</button><span class="eyebrow">UNIT CONTEXT</span><h2 id="admin-unit-title">Pilih konteks demo</h2><p>Perubahan ini hanya mengubah presentasi unit pada local state.</p><button class="unit-option active" type="button" data-unit="rq" aria-pressed="true"><b>RQ</b><span><strong>RQ Blumbang</strong><small>Rumah Qur'an Blumbang</small></span><i aria-hidden="true">✓</i></button><button class="unit-option" type="button" data-unit="qima" aria-pressed="false"><b>Q</b><span><strong>QIMA Platform</strong><small>Platform pusat</small></span><i aria-hidden="true">○</i></button></section></div>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<script src="/static/prototype-admin.js"></script>
</body>
</html>`;
}
