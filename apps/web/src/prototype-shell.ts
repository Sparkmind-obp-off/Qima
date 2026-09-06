export function renderPrototypeShell(): string {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="Demo QIMA, platform pengelolaan pendidikan Al-Qur'an untuk banyak unit dengan satu core bersama.">
  <title>QIMA — Platform Pendidikan Al-Qur'an</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22><rect width=%2264%22 height=%2264%22 rx=%2218%22 fill=%22%23176b56%22/><text x=%2232%22 y=%2243%22 text-anchor=%22middle%22 font-size=%2236%22 fill=%22white%22>ق</text></svg>">
  <link rel="stylesheet" href="/static/prototype.css">
  <link rel="stylesheet" href="/static/prototype-flow.css">
</head>
<body>
<a class="skip-link" href="#main-content">Lewati ke konten utama</a>
<div class="demo-mode-bar" role="note" aria-label="Status demo">
  <span class="demo-indicator" aria-hidden="true"></span>
  <strong>DEMO MODE</strong>
  <span>Data statis · interaksi tidak tersimpan ke production</span>
  <a href="/demo/admin/login">Buka Admin Demo <span aria-hidden="true">→</span></a>
</div>
<div class="prototype-app">
  <header class="site-header">
    <a class="logo" href="#home" aria-label="QIMA, kembali ke awal"><span class="logo-mark" aria-hidden="true">ق</span><span>QIMA</span></a>
    <nav id="public-navigation" aria-label="Navigasi utama">
      <a href="#programs">Program</a>
      <a href="#activities">Aktivitas</a>
      <a href="#about">Tentang</a>
      <a href="#contact">Kontak</a>
      <a class="mobile-admin-link" href="/demo/admin/login">Admin Demo</a>
    </nav>
    <div class="header-actions">
      <button class="unit-pill" id="unit-switcher" type="button" aria-haspopup="dialog" aria-expanded="false">
        <span class="live-dot" aria-hidden="true"></span><span id="unit-label">RQ Blumbang</span><span aria-hidden="true">⌄</span>
      </button>
      <a class="btn btn-primary btn-small" href="#register">Daftar</a>
    </div>
    <button class="menu-button" id="menu-button" type="button" aria-label="Buka navigasi" aria-controls="public-navigation" aria-expanded="false"><span aria-hidden="true">☰</span></button>
  </header>
  <main id="main-content">
    <section class="hero" id="home" aria-labelledby="hero-title">
      <div class="hero-glow glow-one" aria-hidden="true"></div><div class="hero-glow glow-two" aria-hidden="true"></div>
      <div class="hero-copy reveal">
        <div class="platform-context"><span>QIMA PLATFORM</span><i aria-hidden="true">/</i><strong>Unit aktif: <span data-unit-short>RQ Blumbang</span></strong></div>
        <span class="eyebrow">Platform Pendidikan Al-Qur'an</span>
        <h1 id="hero-title">Kelola pendidikan Qur'an dengan <em>lebih terarah.</em></h1>
        <p class="hero-text">QIMA menyatukan pengalaman publik dan operasional setiap unit—dari menemukan program hingga mengelola pendaftaran—dalam satu platform core.</p>
        <div class="hero-actions"><a class="btn btn-primary" href="#programs">Jelajahi Program <span aria-hidden="true">→</span></a><a class="text-link" href="#about">Cara QIMA bekerja <span aria-hidden="true">↗</span></a></div>
        <div class="hero-proof" aria-label="Ringkasan demo unit"><div class="avatar-stack" aria-hidden="true"><span>F</span><span>A</span><span>N</span><span>+</span></div><span><strong>128 peserta aktif</strong><br><small>Data contoh pada unit <span data-unit-short>RQ Blumbang</span></small></span></div>
      </div>
      <div class="hero-visual reveal" aria-label="Pratinjau identitas unit">
        <div class="hero-card">
          <div class="card-top"><span class="mini-brand">RQ</span><span class="status-chip"><span aria-hidden="true">●</span> Unit aktif</span></div>
          <div class="hero-illustration" aria-hidden="true"><div class="arch"></div><div class="book">✦</div><div class="leaf leaf-a">◜</div><div class="leaf leaf-b">◝</div></div>
          <div class="hero-card-bottom"><div><small>IDENTITAS UNIT SAAT INI</small><strong id="hero-unit">Rumah Qur'an Blumbang</strong></div><span class="arrow-circle" aria-hidden="true">→</span></div>
        </div>
        <div class="floating-card float-top"><span aria-hidden="true">✦</span><div><small>Program berjalan</small><strong>6 program</strong></div></div>
        <div class="floating-card float-bottom"><span aria-hidden="true">✓</span><div><small>Pendaftaran baru</small><strong>24 menunggu ditinjau</strong></div></div>
      </div>
    </section>
    <section class="platform-strip" aria-label="Arsitektur platform">
      <div><small>01</small><strong>Satu platform core</strong><span>Standar dan fondasi bersama</span></div><span class="strip-arrow" aria-hidden="true">→</span>
      <div><small>02</small><strong>Banyak unit</strong><span>Operasi tetap terorganisir</span></div><span class="strip-arrow" aria-hidden="true">→</span>
      <div><small>03</small><strong>Identitas khas</strong><span>Brand dan konteks per unit</span></div>
    </section>
    <section class="section" id="programs" aria-labelledby="programs-title">
      <div class="section-heading"><div><span class="eyebrow">Belajar & Bertumbuh</span><h2 id="programs-title">Program yang mudah ditemukan, dipahami, dan diikuti.</h2><p>Pilih program untuk melihat detail jadwal, kapasitas, dan simulasi pendaftaran.</p></div><span class="section-count">03 program unggulan</span></div>
      <div class="program-grid" id="program-grid" aria-live="polite"><div class="state-loading" role="status"><span class="loading-dot"></span>Memuat program demo…</div></div>
    </section>
    <section class="section section-tinted" id="activities" aria-labelledby="activities-title">
      <div class="section-heading"><div><span class="eyebrow">Agenda Unit</span><h2 id="activities-title">Selalu ada ruang untuk hadir bersama.</h2><p>Kegiatan statis berikut menggambarkan pengalaman informasi publik unit.</p></div></div>
      <div class="activity-layout"><article class="activity-feature"><div class="activity-date"><strong>18</strong><span>SEP<br>2026</span></div><div><span class="tag">Kegiatan Unit</span><h3>Khataman & Silaturahmi Santri</h3><p>Jumat, 16.00 WIB · Masjid Al-Ikhlas Blumbang</p><button class="ghost-button" type="button" data-toast="Detail kegiatan tersedia pada integrasi production.">Lihat detail <span aria-hidden="true">→</span></button></div></article><div class="activity-list" aria-label="Agenda berikutnya"><article class="activity-row"><time datetime="2026-09-24">24<br><small>SEP</small></time><div><strong>Kelas Tahsin Pekanan</strong><small>19.30 WIB · RQ Blumbang</small></div><span aria-hidden="true">→</span></article><article class="activity-row"><time datetime="2026-10-01">01<br><small>OKT</small></time><div><strong>Parenting Qur'ani</strong><small>09.00 WIB · Aula Unit</small></div><span aria-hidden="true">→</span></article><article class="activity-row"><time datetime="2026-10-10">10<br><small>OKT</small></time><div><strong>Wisuda Tahfidz</strong><small>08.00 WIB · Lapangan Utama</small></div><span aria-hidden="true">→</span></article></div></div>
    </section>
    <section class="section" id="about" aria-labelledby="about-title"><div class="about-card"><div class="about-visual" aria-hidden="true"><div class="about-orb">ق</div><span>Shared core</span></div><div class="about-copy"><span class="eyebrow">Tentang QIMA</span><h2 id="about-title">Satu fondasi untuk banyak unit pendidikan.</h2><p>QIMA membantu organisasi mengelola program, aktivitas, peserta, dan pendaftaran tanpa menghilangkan identitas masing-masing unit.</p><div class="feature-points"><span>Identitas unit tetap khas</span><span>Operasi lebih terorganisir</span><span>Siap berkembang multi-unit</span><span>Pengalaman publik terpadu</span></div><button class="context-link" id="about-unit-switcher" type="button">Coba ganti unit demo <span aria-hidden="true">→</span></button></div></div></section>
    <section class="cta-section" id="register" aria-labelledby="registration-title"><div><span class="eyebrow light">Simulasi Pendaftaran</span><h2 id="registration-title">Dari minat menjadi langkah pertama.</h2><p>Pilih program, lengkapi data singkat, lalu lihat bagaimana pendaftaran diteruskan ke admin unit.</p><button class="btn btn-light" id="register-button" type="button">Mulai Pendaftaran Demo <span aria-hidden="true">→</span></button><small>Simulasi saja—tidak ada data yang dikirim atau disimpan.</small></div></section>
    <section class="section contact-section" id="contact" aria-labelledby="contact-title"><div><span class="eyebrow">Hubungi Unit</span><h2 id="contact-title">Butuh informasi sebelum mendaftar?</h2><p>Tim <span data-unit-name>Rumah Qur'an Blumbang</span> siap membantu informasi program dan proses pendaftaran.</p></div><address class="contact-card"><strong data-unit-name>Rumah Qur'an Blumbang</strong><span>Blumbang · Banyumas, Jawa Tengah</span><span>Senin–Sabtu · 08.00–17.00 WIB</span><button class="ghost-button" type="button" data-toast="Kontak hanya simulasi; WhatsApp akan dihubungkan saat production.">Hubungi unit <span aria-hidden="true">→</span></button></address></section>
  </main>
  <footer class="site-footer"><a class="logo" href="#home"><span class="logo-mark" aria-hidden="true">ق</span>QIMA</a><p>Satu platform core. Banyak unit dengan identitas masing-masing.</p><span>© 2026 QIMA · Prototype P1</span></footer>
</div>
<div class="modal-backdrop" id="unit-modal" hidden><section class="modal" role="dialog" aria-modal="true" aria-labelledby="unit-modal-title" aria-describedby="unit-modal-description"><button class="modal-close" id="unit-close" type="button" aria-label="Tutup pemilih unit">×</button><span class="eyebrow">Demo Unit Context</span><h2 id="unit-modal-title">Satu core, identitas berbeda.</h2><p id="unit-modal-description">Pilih konteks untuk melihat bagaimana QIMA melayani platform dan unit tanpa fork aplikasi.</p><button class="unit-option active" type="button" data-unit="rq" aria-pressed="true"><b>RQ</b><span><strong>Rumah Qur'an Blumbang</strong><small>Reference unit · Aktif</small></span><i aria-hidden="true">✓</i></button><button class="unit-option" type="button" data-unit="qima" aria-pressed="false"><b>Q</b><span><strong>QIMA Platform</strong><small>Platform identity · Demo</small></span><i aria-hidden="true">○</i></button></section></div>
<div class="demo-flow-modal" id="demo-flow" hidden><section class="demo-flow-card" role="dialog" aria-modal="true" aria-labelledby="flow-title"><button class="modal-close" id="flow-close" type="button" aria-label="Tutup alur pendaftaran">×</button><div class="demo-progress" aria-label="Tahap demo"><span class="done">01 Public</span><span id="flow-step-register">02 Registration</span><span>03 Admin</span></div><div id="flow-content" aria-live="polite"></div></section></div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script src="/static/prototype.js"></script>
</body>
</html>`;
}
