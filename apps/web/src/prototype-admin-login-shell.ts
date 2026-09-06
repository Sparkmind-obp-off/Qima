export function renderPrototypeAdminLoginShell() {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="Gerbang simulasi Admin Demo QIMA.">
  <title>QIMA — Admin Demo Login</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22><rect width=%2264%22 height=%2264%22 rx=%2218%22 fill=%22%23176b56%22/><text x=%2232%22 y=%2243%22 text-anchor=%22middle%22 font-size=%2236%22 fill=%22white%22>ق</text></svg>">
  <link rel="stylesheet" href="/static/prototype.css">
  <link rel="stylesheet" href="/static/prototype-flow.css">
</head>
<body class="admin-demo">
<a class="skip-link" href="#login-content">Lewati ke konten utama</a>
<div class="demo-mode-bar demo-mode-bar-admin" role="note"><span class="demo-indicator" aria-hidden="true"></span><strong>DEMO MODE</strong><span>Simulasi login · tanpa kredensial production</span><a href="/demo">Kembali ke Public <span aria-hidden="true">↗</span></a></div>
<main class="demo-login-page" id="login-content">
  <section class="demo-login-card" aria-labelledby="login-title">
    <a class="logo" href="/demo" aria-label="QIMA, kembali ke public demo"><span class="logo-mark" aria-hidden="true">ق</span>QIMA</a>
    <div class="login-role"><span class="eyebrow">Admin Demo</span><span class="status-chip"><span aria-hidden="true">●</span> Simulasi</span></div>
    <h1 id="login-title">Lihat sisi operasional dari pengalaman yang sama.</h1>
    <p>Masuk sebagai administrator demo untuk meninjau bagaimana program, aktivitas, peserta, dan pendaftaran dikelola dalam konteks unit.</p>
    <div class="demo-login-context"><small>UNIT CONTEXT</small><div><span class="mini-brand" id="login-unit-mark" aria-hidden="true">RQ</span><span><strong id="login-unit-name">Rumah Qur'an Blumbang</strong><small>Administrator · Demo Mode</small></span></div></div>
    <div class="login-disclosure"><span aria-hidden="true">ⓘ</span><p><strong>Tidak memerlukan email atau kata sandi.</strong> Tombol di bawah hanya menyimpan status demo di sesi browser dan tidak melakukan autentikasi production.</p></div>
    <button class="btn btn-primary demo-login-button" id="demo-login-button" type="button">Masuk sebagai Admin Demo <span aria-hidden="true">→</span></button>
    <a class="text-link login-back" href="/demo">← Kembali ke Public Demo</a>
    <ol class="demo-steps" aria-label="Tahap demo"><li class="done">01 Public</li><li class="done">02 Registration</li><li aria-current="step">03 Admin</li></ol>
  </section>
  <aside class="login-story" aria-label="Hubungan public dan admin"><span class="eyebrow light">SATU PLATFORM</span><h2>Dari pengalaman publik ke operasi unit.</h2><div><span>Public</span><i aria-hidden="true">→</i><span>Registration</span><i aria-hidden="true">→</i><strong>Admin</strong></div><p>QIMA menjaga perjalanan tetap terhubung, sementara setiap unit membawa identitas dan konteksnya sendiri.</p></aside>
</main>
<script>
const button = document.querySelector('#demo-login-button');
try {
  const activeUnit = sessionStorage.getItem('qima-demo-unit');
  if (activeUnit === 'qima') {
    document.querySelector('#login-unit-mark').textContent = 'Q';
    document.querySelector('#login-unit-name').textContent = 'QIMA Platform';
  }
} catch {}
button?.addEventListener('click', () => {
  button.disabled = true;
  button.innerHTML = '<span class="button-spinner" aria-hidden="true"></span>Menyiapkan Admin Demo…';
  sessionStorage.setItem('qima-demo-admin', '1');
  window.setTimeout(() => { window.location.href = '/demo/admin'; }, 450);
});
</script>
</body>
</html>`;
}
