export function renderPrototypeAdminShell() {
  return `<!doctype html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QIMA Admin Demo</title><link rel="stylesheet" href="/static/prototype.css"></head>
<body class="admin-demo">
<div class="demo-mode-bar demo-mode-bar-admin"><span>●</span><strong>ADMIN DEMO</strong><span>Simulasi operasional · tidak menyimpan data production</span><a href="/demo">← Kembali Public</a></div>
<div class="admin-layout">
<aside class="admin-sidebar">
  <a class="brand" href="/demo"><span class="brand-mark">Q</span><span><strong>QIMA</strong><small>Admin Demo</small></span></a>
  <div class="admin-unit"><small>UNIT CONTEXT</small><button id="admin-unit-switcher">RQ Blumbang <span>⌄</span></button></div>
  <nav class="admin-nav">
    <button class="active" data-view="dashboard">⌂ <span>Dashboard</span></button>
    <button data-view="programs">▣ <span>Program</span></button>
    <button data-view="activities">◷ <span>Aktivitas</span></button>
    <button data-view="registrations">✓ <span>Pendaftaran</span><b>8</b></button>
    <button data-view="participants">◎ <span>Peserta</span></button>
  </nav>
  <div class="admin-sidebar-bottom"><button data-toast="Pengaturan demo belum terhubung ke backend.">⚙ <span>Pengaturan</span></button><a href="/demo">↩ <span>Kembali ke Public</span></a></div>
</aside>
<main class="admin-main">
  <header class="admin-topbar"><button id="admin-menu" class="admin-menu">☰</button><div><small>UNIT AKTIF</small><strong id="admin-unit-label">Rumah Qur'an Blumbang</strong></div><div class="admin-user"><span class="avatar">AD</span><span><strong>Admin Demo</strong><small>Administrator</small></span></div></header>
  <section id="admin-dashboard" class="admin-view">
    <div class="admin-heading"><div><span class="eyebrow">QIMA PLATFORM</span><h1>Selamat datang, Admin.</h1><p>Ringkasan operasional unit RQ Blumbang untuk demo meeting.</p></div><button class="admin-primary" data-view-target="programs">+ Program Baru</button></div>
    <div class="stat-grid"><article><small>Peserta Aktif</small><strong>128</strong><span>↑ 12% bulan ini</span></article><article><small>Program Berjalan</small><strong>6</strong><span>2 akan dimulai</span></article><article><small>Pendaftaran Baru</small><strong>24</strong><span>8 perlu ditinjau</span></article><article><small>Aktivitas Bulan Ini</small><strong>14</strong><span>4 agenda terdekat</span></article></div>
    <div class="admin-grid"><article class="admin-panel"><div class="panel-head"><div><span class="eyebrow">RECENT REGISTRATIONS</span><h2>Pendaftaran terbaru</h2></div><button data-view-target="registrations">Lihat semua →</button></div><div class="data-list"><div><span class="avatar mini">AR</span><div><strong>Ahmad Rizky</strong><small>Tahsin & Tahfidz</small></div><em class="status pending">Menunggu</em></div><div><span class="avatar mini">NA</span><div><strong>Nabila Aulia</strong><small>Kelas Qur'an Anak</small></div><em class="status approved">Diterima</em></div><div><span class="avatar mini">FH</span><div><strong>Fajar Hidayat</strong><small>Tahsin & Tahfidz</small></div><em class="status approved">Diterima</em></div><div><span class="avatar mini">SR</span><div><strong>Siti Rahma</strong><small>Kajian Qur'ani</small></div><em class="status pending">Menunggu</em></div></div></article>
    <article class="admin-panel"><div class="panel-head"><div><span class="eyebrow">UPCOMING</span><h2>Agenda terdekat</h2></div><button data-view-target="activities">Semua agenda →</button></div><div class="agenda"><div><strong>07</strong><span><b>Setoran Hafalan</b><small>07 Sep · 16.00 WIB</small></span></div><div><strong>10</strong><span><b>Kelas Qur'an Anak</b><small>10 Sep · 15.30 WIB</small></span></div><div><strong>14</strong><span><b>Kajian Qur'ani</b><small>14 Sep · 19.30 WIB</small></span></div></div></article></div>
    <article class="admin-panel"><div class="panel-head"><div><span class="eyebrow">ACTIVE PROGRAMS</span><h2>Program unit</h2></div><button data-view-target="programs">Kelola program →</button></div><div class="program-admin-grid"><div><strong>Tahsin & Tahfidz</strong><span>42 peserta · Aktif</span><b>68%</b></div><div><strong>Kelas Qur'an Anak</strong><span>31 peserta · Aktif</span><b>54%</b></div><div><strong>Kajian Qur'ani</strong><span>55 peserta · Aktif</span><b>82%</b></div></div></article>
  </section>
  <section id="admin-table-view" class="admin-view" hidden></section>
</main></div>
<div id="admin-unit-modal" class="modal" hidden><div class="modal-card"><button class="modal-close" id="admin-unit-close">×</button><span class="eyebrow">UNIT CONTEXT</span><h2>Pilih unit demo</h2><button class="unit-option active" data-unit="rq"><strong>RQ Blumbang</strong><small>Rumah Qur'an Blumbang</small></button><button class="unit-option" data-unit="qima"><strong>QIMA Platform</strong><small>Platform pusat</small></button></div></div><div id="toast" class="toast"></div><script src="/static/prototype-admin.js"></script></body></html>`;
}
