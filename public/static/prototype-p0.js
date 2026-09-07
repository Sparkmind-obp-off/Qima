(() => {
  'use strict';

  const roles = {
    manager: { label: 'Pengelola', icon: '◈', path: ['Dashboard', 'Kelas', 'Santri', 'Kehadiran / Progres', 'Insight'], text: 'Melihat kondisi unit, kelas, peserta, lalu menemukan hal yang perlu diperhatikan.' },
    admin: { label: 'Admin', icon: '▦', path: ['Dashboard', 'Santri', 'Tambah / Edit', 'Kelas', 'Kehadiran'], text: 'Menjalankan pekerjaan administrasi peserta, kelas, dan kehadiran.' },
    teacher: { label: 'Guru', icon: '✦', path: ['Beranda Guru', 'Jadwal', 'Kelas', 'Santri', 'Catatan'], text: 'Membuka jadwal, kelas, peserta, dan mencatat perkembangan belajar.' },
    parent: { label: 'Orang Tua / Santri', icon: '◉', path: ['Beranda', 'Jadwal', 'Progres', 'Informasi'], text: 'Melihat jadwal, perkembangan belajar, dan informasi dari unit.' },
  };

  const scenarios = {
    new: { label: 'Santri Baru', icon: '+', title: 'Santri baru masuk ke alur kerja', desc: 'Mulai dari pendaftaran, lalu lihat bagaimana informasi peserta diteruskan ke admin.', result: 'Pendaftaran siap ditinjau admin.', action: 'Buka Admin Demo', href: '/demo/admin/login' },
    attendance: { label: 'Kehadiran', icon: '✓', title: 'Cek kehadiran kelas', desc: 'Lihat contoh ringkas kondisi kehadiran tanpa perlu membuka banyak menu.', result: '2 hadir · 1 izin · 1 perlu ditindaklanjuti.', action: 'Lihat Admin Demo', href: '/demo/admin' },
    progress: { label: 'Progres', icon: '↗', title: 'Pantau progres peserta', desc: 'Gunakan ringkasan progres untuk menemukan peserta yang membutuhkan perhatian.', result: '3 peserta perlu diperhatikan minggu ini.', action: 'Lanjut ke Admin Demo', href: '/demo/admin' },
    agenda: { label: 'Agenda', icon: '▣', title: 'Lihat agenda unit', desc: 'Hubungkan kegiatan hari ini dengan konteks operasional unit.', result: '3 agenda terdekat siap ditinjau.', action: 'Lihat Agenda', href: '#activities' },
  };

  const steps = [
    { title: 'Mulai dari peran Anda', text: 'Pilih konteks agar demo mengikuti pekerjaan yang paling dekat dengan Anda.' },
    { title: 'Pilih situasi yang ingin dilihat', text: 'QIMA bukan sekadar menu. Pilih satu situasi nyata untuk dimainkan.' },
    { title: 'Ikuti alurnya', text: 'Setiap langkah memakai data contoh agar Anda bisa menilai apakah alurnya masuk akal.' },
    { title: 'Lihat hasilnya', text: 'Di akhir, kita tampilkan ringkasan yang bisa menjadi bahan diskusi kebutuhan lembaga.' },
    { title: 'Berikan masukan', text: 'Prototype ini sengaja belum production. Masukan Anda menentukan apa yang perlu dibangun berikutnya.' },
  ];

  const css = `
    .p0-launch { margin-left: 12px; }
    .p0-modal { position:fixed; inset:0; z-index:80; background:#0c1a1590; backdrop-filter:blur(8px); display:grid; place-items:center; padding:18px; }
    .p0-modal[hidden] { display:none; }
    .p0-card { position:relative; width:min(920px,100%); max-height:92vh; overflow:auto; background:#fffefa; border-radius:28px; padding:32px; box-shadow:0 30px 100px #0005; }
    .p0-close { position:absolute; right:20px; top:20px; width:38px; height:38px; border:0; border-radius:10px; background:transparent; color:#6f7b75; font-size:25px; cursor:pointer; }
    .p0-close:hover { background:#edf1ed; }
    .p0-kicker { color:#176b56; font-size:10px; font-weight:850; letter-spacing:.11em; text-transform:uppercase; }
    .p0-card h2 { font-family:Georgia,serif; font-size:40px; line-height:1.06; margin:10px 0 12px; color:#17362d; }
    .p0-lead { color:#6d7973; line-height:1.65; max-width:680px; }
    .p0-progress { display:flex; gap:7px; margin:0 44px 24px 0; }
    .p0-progress span { flex:1; height:5px; border-radius:99px; background:#e8ece7; }
    .p0-progress span.on { background:#176b56; }
    .p0-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:24px; }
    .p0-choice { text-align:left; border:1px solid #dfe6df; background:#fff; border-radius:17px; padding:18px; cursor:pointer; color:#17362d; }
    .p0-choice:hover,.p0-choice.selected { border-color:#176b56; box-shadow:0 0 0 3px #176b5612; transform:translateY(-1px); }
    .p0-choice b { display:grid; place-items:center; width:38px; height:38px; border-radius:11px; background:#e7efe9; color:#176b56; margin-bottom:13px; }
    .p0-choice strong { display:block; font-size:14px; }
    .p0-choice small { display:block; color:#7b8781; line-height:1.5; margin-top:5px; }
    .p0-actions { display:flex; align-items:center; gap:15px; flex-wrap:wrap; margin-top:26px; }
    .p0-link { border:0; background:transparent; color:#176b56; font-weight:800; cursor:pointer; padding:8px; }
    .p0-path { display:flex; flex-wrap:wrap; gap:8px; margin:22px 0; }
    .p0-path span { padding:8px 11px; border-radius:999px; background:#eef2ed; color:#64716a; font-size:10px; font-weight:800; }
    .p0-path span:first-child { background:#e3eee6; color:#176b56; }
    .p0-scenario { display:grid; grid-template-columns:1.1fr .9fr; gap:18px; margin-top:24px; }
    .p0-result { border:1px solid #dce5dd; border-radius:18px; background:#f1f5ef; padding:20px; }
    .p0-result small { display:block; color:#748078; font-size:9px; letter-spacing:.1em; font-weight:850; text-transform:uppercase; }
    .p0-result strong { display:block; margin-top:8px; color:#176b56; font-size:16px; line-height:1.4; }
    .p0-step-label { color:#7a857f; font-size:10px; font-weight:850; letter-spacing:.08em; text-transform:uppercase; }
    .p0-feedback { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:22px; }
    .p0-feedback button { border:1px solid #dfe6df; border-radius:14px; padding:13px; background:#fff; cursor:pointer; text-align:left; font-weight:750; color:#254139; }
    .p0-feedback button:hover { border-color:#176b56; background:#f5f8f4; }
    .p0-note { margin-top:16px; padding:12px 14px; border-radius:12px; background:#f2f5ef; color:#6d7973; font-size:11px; line-height:1.6; }
    @media (max-width:680px) { .p0-card{padding:24px 18px;border-radius:22px}.p0-card h2{font-size:32px}.p0-grid,.p0-scenario,.p0-feedback{grid-template-columns:1fr}.p0-launch{margin:8px 0 0}.p0-actions{align-items:stretch}.p0-actions .btn{width:100%;justify-content:center}.p0-progress{margin-right:42px} }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const modal = document.createElement('div');
  modal.className = 'p0-modal';
  modal.id = 'qima-p0-demo';
  modal.hidden = true;
  modal.innerHTML = `<section class="p0-card" role="dialog" aria-modal="true" aria-labelledby="p0-title">
    <button class="p0-close" id="p0-close" type="button" aria-label="Tutup demo">×</button>
    <div class="p0-progress" aria-label="Progress guided demo">${steps.map((_, i) => `<span data-p0-progress="${i}"></span>`).join('')}</div>
    <div id="p0-content"></div>
  </section>`;
  document.body.appendChild(modal);

  const content = modal.querySelector('#p0-content');
  const state = { screen: 'welcome', role: null, scenario: null, step: 0 };

  function setProgress(index) {
    modal.querySelectorAll('[data-p0-progress]').forEach((bar, i) => bar.classList.toggle('on', i <= index));
  }

  function open() {
    modal.hidden = false;
    document.body.classList.add('flow-open');
    renderWelcome();
    modal.querySelector('.p0-close')?.focus();
  }
  function close() {
    modal.hidden = true;
    document.body.classList.remove('flow-open');
  }
  function button(label, id = '') { return `<button class="btn btn-primary" type="button" ${id ? `id="${id}"` : ''}>${label} <span aria-hidden="true">→</span></button>`; }

  function renderWelcome() {
    setProgress(-1);
    content.innerHTML = `<span class="p0-kicker">QIMA · PROTOTYPE DEMO</span><h2 id="p0-title">Kelola aktivitas Rumah Qur'an dengan lebih terstruktur.</h2><p class="p0-lead">Ikuti demo singkat berbasis peran dan situasi nyata. Data di sini statis; tujuannya untuk memvalidasi alur kerja sebelum QIMA dibangun ke production.</p><div class="p0-note">Target demo: memahami konsep ≤2 menit dan memainkan satu alur ≤5 menit.</div><div class="p0-actions">${button('Mulai Demo', 'p0-start')}<button class="p0-link" id="p0-skip">Lihat halaman public dulu</button></div>`;
    content.querySelector('#p0-start').onclick = () => { state.screen = 'role'; renderRole(); };
    content.querySelector('#p0-skip').onclick = close;
  }

  function renderRole() {
    setProgress(0);
    content.innerHTML = `<span class="p0-step-label">Guided Demo · 1/5</span><h2 id="p0-title">Pilih peran Anda.</h2><p class="p0-lead">Demo akan menyesuaikan sudut pandang, tetapi semua data tetap berupa simulasi.</p><div class="p0-grid">${Object.entries(roles).map(([key, role]) => `<button class="p0-choice" type="button" data-role="${key}"><b>${role.icon}</b><strong>${role.label}</strong><small>${role.text}</small></button>`).join('')}</div><div class="p0-actions"><button class="p0-link" id="p0-back">Kembali</button></div>`;
    content.querySelectorAll('[data-role]').forEach(btn => btn.onclick = () => { state.role = btn.dataset.role; state.step = 1; renderScenario(); });
    content.querySelector('#p0-back').onclick = renderWelcome;
  }

  function renderScenario() {
    setProgress(1);
    content.innerHTML = `<span class="p0-step-label">Guided Demo · 2/5</span><h2 id="p0-title">Pilih situasi yang ingin dimainkan.</h2><p class="p0-lead">Pilih satu skenario. Anda bisa menggantinya kapan saja selama demo.</p><div class="p0-grid">${Object.entries(scenarios).map(([key, item]) => `<button class="p0-choice" type="button" data-scenario="${key}"><b>${item.icon}</b><strong>${item.label}</strong><small>${item.desc}</small></button>`).join('')}</div><div class="p0-actions"><button class="p0-link" id="p0-back">Kembali</button></div>`;
    content.querySelectorAll('[data-scenario]').forEach(btn => btn.onclick = () => { state.scenario = btn.dataset.scenario; state.step = 2; renderPlayable(); });
    content.querySelector('#p0-back').onclick = renderRole;
  }

  function renderPlayable() {
    setProgress(2);
    const role = roles[state.role];
    const scenario = scenarios[state.scenario];
    const path = role.path.map(item => `<span>${item}</span>`).join('');
    content.innerHTML = `<span class="p0-step-label">Guided Demo · 3/5</span><h2 id="p0-title">${scenario.title}</h2><p class="p0-lead">${scenario.desc}</p><div class="p0-path" aria-label="Journey ${role.label}">${path}</div><div class="p0-scenario"><div><span class="p0-kicker">Sudut pandang</span><h3>${role.label}</h3><p class="p0-lead">${role.text}</p><div class="p0-note">Langkah aktif: <strong>${role.path[Math.min(2, role.path.length - 1)]}</strong>. Semua perubahan hanya simulasi lokal.</div></div><div class="p0-result"><small>Contoh kondisi</small><strong>${scenario.result}</strong><div class="p0-actions"><button class="btn btn-primary" id="p0-play">Mainkan langkah berikutnya <span aria-hidden="true">→</span></button></div></div></div><div class="p0-actions"><button class="p0-link" id="p0-back">Ganti skenario</button></div>`;
    content.querySelector('#p0-play').onclick = renderResult;
    content.querySelector('#p0-back').onclick = renderScenario;
  }

  function renderResult() {
    setProgress(3);
    const scenario = scenarios[state.scenario];
    content.innerHTML = `<span class="p0-step-label">Guided Demo · 4/5</span><h2 id="p0-title">Hasil yang terlihat jelas.</h2><p class="p0-lead">${scenario.result} Inilah titik yang nantinya perlu divalidasi bersama pengelola lembaga: data apa yang benar-benar dibutuhkan dan tindakan apa yang harus muncul.</p><div class="p0-result"><small>Scenario result</small><strong>${scenario.label} · ${scenario.result}</strong><p class="p0-lead">Jalur ${roles[state.role].label}: ${roles[state.role].path.join(' → ')}.</p></div><div class="p0-actions">${button('Lanjut ke Feedback', 'p0-feedback-next')}<button class="p0-link" id="p0-replay">Mainkan lagi</button></div>`;
    content.querySelector('#p0-feedback-next').onclick = renderFeedback;
    content.querySelector('#p0-replay').onclick = renderPlayable;
  }

  function renderFeedback() {
    setProgress(4);
    content.innerHTML = `<span class="p0-step-label">Guided Demo · 5/5</span><h2 id="p0-title">Apa yang perlu diubah?</h2><p class="p0-lead">Pilih respons yang paling dekat dengan kondisi lembaga Anda. Respons ini hanya dicatat di browser demo, tidak dikirim ke server.</p><div class="p0-feedback"><button type="button" data-feedback="Sangat relevan">✓ Sangat relevan</button><button type="button" data-feedback="Cukup relevan">~ Cukup relevan</button><button type="button" data-feedback="Belum sesuai">× Belum sesuai</button><button type="button" data-feedback="Kebutuhan lain">＋ Kebutuhan lain</button></div><div class="p0-actions"><button class="p0-link" id="p0-change-scenario">Coba skenario lain</button><a class="btn btn-primary" href="${scenarios[state.scenario].href}" id="p0-continue">${scenarios[state.scenario].action} <span aria-hidden="true">→</span></a></div>`;
    content.querySelectorAll('[data-feedback]').forEach(btn => btn.onclick = () => {
      try { sessionStorage.setItem('qima-demo-feedback', btn.dataset.feedback); } catch {}
      btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const note = document.createElement('div'); note.className = 'p0-note'; note.textContent = `Tercatat sebagai “${btn.dataset.feedback}” untuk sesi demo ini.`; content.appendChild(note);
    });
    content.querySelector('#p0-change-scenario').onclick = renderScenario;
  }

  const launch = document.createElement('button');
  launch.type = 'button'; launch.className = 'btn btn-primary btn-small p0-launch'; launch.textContent = 'Mulai Demo';
  launch.id = 'p0-launch';
  const heroActions = document.querySelector('.hero-actions');
  if (heroActions) heroActions.appendChild(launch);
  launch.onclick = open;

  modal.querySelector('#p0-close').onclick = close;
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) close(); });

  let autoShown = false;
  try { autoShown = sessionStorage.getItem('qima-p0-onboarding-seen') === '1'; } catch {}
  if (!autoShown) {
    setTimeout(() => { if (!modal.hidden) return; try { sessionStorage.setItem('qima-p0-onboarding-seen', '1'); } catch {} open(); }, 450);
  }
})();
