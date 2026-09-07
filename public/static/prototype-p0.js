(() => {
  'use strict';

  const roles = {
    manager: {
      label: 'Pengelola',
      icon: 'P',
      path: ['Dashboard', 'Kelas', 'Santri', 'Kehadiran / Progres', 'Insight'],
      text: 'Melihat kondisi unit, kelas, santri, lalu menemukan hal yang perlu diperhatikan.',
      question: 'Informasi apa yang biasanya dicari pengelola pertama kali?',
    },
    admin: {
      label: 'Admin',
      icon: 'A',
      path: ['Dashboard', 'Santri', 'Tambah / Edit', 'Kelas', 'Kehadiran'],
      text: 'Menjalankan pekerjaan administrasi santri, kelas, dan kehadiran.',
      question: 'Bagian administrasi mana yang paling merepotkan sekarang?',
    },
    teacher: {
      label: 'Guru',
      icon: 'G',
      path: ['Beranda Guru', 'Jadwal', 'Kelas', 'Santri', 'Catatan'],
      text: 'Membuka jadwal, kelas, santri, dan mencatat perkembangan belajar.',
      question: 'Saat mengajar, data apa yang paling sering perlu dilihat?',
    },
    parent: {
      label: 'Orang Tua / Santri',
      icon: 'O',
      path: ['Beranda', 'Jadwal', 'Progres', 'Informasi'],
      text: 'Melihat jadwal, perkembangan belajar, dan informasi dari unit.',
      question: 'Informasi apa yang paling ingin diterima dari lembaga?',
    },
  };

  const scenarios = {
    new: {
      label: 'Santri Baru',
      icon: '+',
      title: 'Hubungkan santri baru ke kelas yang tepat.',
      desc: 'Isi data singkat, pilih kelas, lalu lihat status yang akan diteruskan kepada admin.',
      result: 'Santri baru siap ditinjau dan ditempatkan di kelas.',
      action: 'Buka Admin Demo',
      href: '/demo/admin/login',
    },
    attendance: {
      label: 'Kehadiran',
      icon: 'H',
      title: 'Catat kondisi kehadiran satu kelas.',
      desc: 'Perbarui status santri, lalu lihat siapa yang memerlukan tindak lanjut.',
      result: 'Ringkasan kehadiran dan tindak lanjut tersedia.',
      action: 'Lihat Admin Demo',
      href: '/demo/admin',
    },
    progress: {
      label: 'Progres',
      icon: 'Pr',
      title: 'Catat progres belajar secara ringkas.',
      desc: 'Pilih capaian terbaru dan tentukan apakah santri memerlukan perhatian.',
      result: 'Catatan progres siap menjadi bahan tindak lanjut.',
      action: 'Lanjut ke Admin Demo',
      href: '/demo/admin',
    },
    agenda: {
      label: 'Agenda',
      icon: 'Ag',
      title: 'Tentukan agenda yang perlu diperhatikan.',
      desc: 'Tinjau agenda terdekat dan pilih kegiatan yang perlu diprioritaskan.',
      result: 'Agenda prioritas terlihat dalam konteks operasional unit.',
      action: 'Lihat Agenda Public',
      href: '#activities',
    },
  };

  const css = `
    .p0-launch { margin-left: 12px; }
    .p0-modal { position:fixed; inset:0; z-index:80; background:#0c1a1590; backdrop-filter:blur(8px); display:grid; place-items:center; padding:18px; }
    .p0-modal[hidden] { display:none; }
    .p0-card { position:relative; width:min(940px,100%); max-height:92vh; overflow:auto; background:#fffefa; border-radius:28px; padding:32px; box-shadow:0 30px 100px #0005; }
    .p0-close { position:absolute; right:20px; top:20px; width:38px; height:38px; border:0; border-radius:10px; background:transparent; color:#6f7b75; font-size:25px; cursor:pointer; }
    .p0-close:hover { background:#edf1ed; }
    .p0-kicker { color:#176b56; font-size:10px; font-weight:850; letter-spacing:.11em; text-transform:uppercase; }
    .p0-card h2 { font-family:Georgia,serif; font-size:40px; line-height:1.06; margin:10px 0 12px; color:#17362d; }
    .p0-card h3 { color:#17362d; margin:8px 0; }
    .p0-lead { color:#6d7973; line-height:1.65; max-width:720px; }
    .p0-progress-wrap { display:flex; align-items:center; gap:16px; margin:0 44px 24px 0; }
    .p0-progress { display:flex; flex:1; gap:7px; }
    .p0-progress span { flex:1; height:5px; border-radius:99px; background:#e8ece7; }
    .p0-progress span.on { background:#176b56; }
    .p0-skip { border:0; background:transparent; color:#6d7973; font-size:10px; font-weight:800; cursor:pointer; white-space:nowrap; }
    .p0-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:24px; }
    .p0-choice { text-align:left; border:1px solid #dfe6df; background:#fff; border-radius:17px; padding:18px; cursor:pointer; color:#17362d; }
    .p0-choice:hover,.p0-choice.selected { border-color:#176b56; box-shadow:0 0 0 3px #176b5612; transform:translateY(-1px); }
    .p0-choice b { display:grid; place-items:center; width:38px; height:38px; border-radius:11px; background:#e7efe9; color:#176b56; margin-bottom:13px; font-size:12px; }
    .p0-choice strong { display:block; font-size:14px; }
    .p0-choice small { display:block; color:#7b8781; line-height:1.5; margin-top:5px; }
    .p0-actions { display:flex; align-items:center; gap:15px; flex-wrap:wrap; margin-top:26px; }
    .p0-link { border:0; background:transparent; color:#176b56; font-weight:800; cursor:pointer; padding:8px; }
    .p0-path { display:flex; flex-wrap:wrap; align-items:center; gap:7px; margin:18px 0; }
    .p0-path span { padding:8px 11px; border-radius:999px; background:#eef2ed; color:#64716a; font-size:10px; font-weight:800; }
    .p0-path i { color:#9aa49f; font-style:normal; }
    .p0-path span.active { background:#176b56; color:#fff; }
    .p0-workspace { display:grid; grid-template-columns:minmax(0,1.2fr) minmax(240px,.8fr); gap:18px; margin-top:20px; }
    .p0-panel,.p0-result { border:1px solid #dce5dd; border-radius:18px; padding:20px; background:#fff; }
    .p0-result { background:#f1f5ef; }
    .p0-result small,.p0-panel-label { display:block; color:#748078; font-size:9px; letter-spacing:.1em; font-weight:850; text-transform:uppercase; }
    .p0-result strong { display:block; margin-top:8px; color:#176b56; font-size:16px; line-height:1.4; }
    .p0-step-label { color:#7a857f; font-size:10px; font-weight:850; letter-spacing:.08em; text-transform:uppercase; }
    .p0-note { margin-top:16px; padding:12px 14px; border-radius:12px; background:#f2f5ef; color:#6d7973; font-size:11px; line-height:1.6; }
    .p0-form { display:grid; gap:8px; margin-top:14px; }
    .p0-form label { font-size:11px; font-weight:800; color:#43554e; }
    .p0-form input,.p0-form select,.p0-form textarea { width:100%; padding:11px 12px; border:1px solid #dce5dd; border-radius:11px; background:#fff; color:#17362d; font:inherit; }
    .p0-form input:focus,.p0-form select:focus,.p0-form textarea:focus { border-color:#176b56; outline:3px solid #176b5614; }
    .p0-error { color:#a43c3c; font-size:10px; font-weight:700; }
    .p0-roster { display:grid; gap:9px; margin-top:14px; }
    .p0-roster-row { display:grid; grid-template-columns:1fr auto; align-items:center; gap:12px; padding:11px 12px; border:1px solid #e1e7e1; border-radius:12px; }
    .p0-roster-row strong,.p0-roster-row small { display:block; }
    .p0-roster-row small { color:#7b8781; margin-top:3px; }
    .p0-statuses { display:flex; gap:5px; }
    .p0-statuses button,.p0-agenda-item { border:1px solid #dfe6df; background:#fff; border-radius:9px; padding:7px 9px; color:#53635c; font-size:10px; font-weight:750; cursor:pointer; }
    .p0-statuses button.selected,.p0-agenda-item.selected { border-color:#176b56; background:#e7efe9; color:#176b56; }
    .p0-agenda-list { display:grid; gap:9px; margin-top:14px; }
    .p0-agenda-item { display:grid; grid-template-columns:auto 1fr; gap:12px; text-align:left; padding:13px; }
    .p0-agenda-item b { color:#176b56; font-size:18px; }
    .p0-agenda-item strong,.p0-agenda-item small { display:block; }
    .p0-agenda-item small { color:#7b8781; margin-top:4px; }
    .p0-feedback { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:22px; }
    .p0-feedback button { border:1px solid #dfe6df; border-radius:14px; padding:13px; background:#fff; cursor:pointer; text-align:left; font-weight:750; color:#254139; }
    .p0-feedback button:hover,.p0-feedback button.selected { border-color:#176b56; background:#f5f8f4; }
    .p0-complete { display:grid; place-items:center; width:62px; height:62px; border-radius:50%; background:#e5eee6; color:#176b56; font-size:26px; font-weight:900; box-shadow:0 0 0 9px #e5eee655; margin:8px 0 24px; }
    @media (max-width:680px) { .p0-card{padding:24px 18px;border-radius:22px}.p0-card h2{font-size:32px}.p0-grid,.p0-workspace,.p0-feedback{grid-template-columns:1fr}.p0-launch{margin:8px 0 0}.p0-actions{align-items:stretch}.p0-actions .btn{width:100%;justify-content:center}.p0-progress-wrap{margin-right:42px}.p0-skip{display:none}.p0-roster-row{grid-template-columns:1fr}.p0-statuses{flex-wrap:wrap} }
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
    <div class="p0-progress-wrap"><div class="p0-progress" aria-label="Progress guided demo">${Array.from({ length: 5 }, (_, index) => `<span data-p0-progress="${index}"></span>`).join('')}</div><button class="p0-skip" id="p0-skip-tour" type="button">Lewati tour</button></div>
    <div id="p0-content" aria-live="polite"></div>
  </section>`;
  document.body.appendChild(modal);

  const content = modal.querySelector('#p0-content');
  const state = {
    role: null,
    scenario: null,
    outcome: '',
    detail: '',
    lastFocus: null,
  };

  function escapeHtml(value) {
    const element = document.createElement('div');
    element.textContent = String(value);
    return element.innerHTML;
  }

  function setProgress(index) {
    modal.querySelectorAll('[data-p0-progress]').forEach((bar, position) => {
      bar.classList.toggle('on', position <= index);
    });
  }

  function focusContent() {
    requestAnimationFrame(() => content.querySelector('button, input, select, a')?.focus());
  }

  function open() {
    state.lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('flow-open');
    renderWelcome();
    focusContent();
  }

  function close() {
    modal.hidden = true;
    document.body.classList.remove('flow-open');
    state.lastFocus?.focus?.();
  }

  function primaryButton(label, id, disabled = false) {
    return `<button class="btn btn-primary" type="button" id="${id}"${disabled ? ' disabled' : ''}>${label} <span aria-hidden="true">→</span></button>`;
  }

  function stepHeader(step) {
    const role = roles[state.role];
    const scenario = scenarios[state.scenario];
    const context = role && scenario ? `${role.label} · ${scenario.label}` : role ? role.label : '';
    return `<span class="p0-step-label">Guided Demo · ${step}/5${context ? ` · ${context}` : ''}</span>`;
  }

  function renderWelcome() {
    setProgress(-1);
    content.innerHTML = `<span class="p0-kicker">QIMA · PROTOTYPE DEMO</span><h2 id="p0-title">Satu tempat untuk membantu lembaga mengelola aktivitas Rumah Qur'an dengan lebih terstruktur.</h2><p class="p0-lead">Ikuti demo singkat berbasis peran dan situasi sehari-hari. Data di sini statis; tujuannya untuk memvalidasi alur kerja sebelum QIMA dibangun ke production.</p><div class="p0-note">Target demo: pahami konsep sekitar dua menit, lalu mainkan satu alur dalam sekitar lima menit.</div><div class="p0-actions">${primaryButton('Mulai Demo', 'p0-start')}<button class="p0-link" id="p0-see-public" type="button">Lihat halaman public dulu</button></div>`;
    content.querySelector('#p0-start').onclick = renderRole;
    content.querySelector('#p0-see-public').onclick = close;
  }

  function renderRole() {
    setProgress(0);
    content.innerHTML = `${stepHeader(1)}<h2 id="p0-title">Anda ingin melihat QIMA dari sisi siapa?</h2><p class="p0-lead">Pilih konteks kerja. Ini hanya pergantian sudut pandang demo, bukan autentikasi atau hak akses production.</p><div class="p0-grid">${Object.entries(roles).map(([key, role]) => `<button class="p0-choice${state.role === key ? ' selected' : ''}" type="button" data-role="${key}"><b>${role.icon}</b><strong>${role.label}</strong><small>${role.text}</small></button>`).join('')}</div><div class="p0-actions"><button class="p0-link" id="p0-back" type="button">Kembali</button></div>`;
    content.querySelectorAll('[data-role]').forEach((choice) => {
      choice.onclick = () => {
        state.role = choice.dataset.role;
        renderScenario();
      };
    });
    content.querySelector('#p0-back').onclick = renderWelcome;
    focusContent();
  }

  function renderScenario() {
    setProgress(1);
    content.innerHTML = `${stepHeader(2)}<h2 id="p0-title">Situasi mana yang ingin Anda mainkan?</h2><p class="p0-lead">Pilih satu pekerjaan nyata. Anda dapat kembali dan membandingkan skenario lain kapan saja.</p><div class="p0-grid">${Object.entries(scenarios).map(([key, scenario]) => `<button class="p0-choice${state.scenario === key ? ' selected' : ''}" type="button" data-scenario="${key}"><b>${scenario.icon}</b><strong>${scenario.label}</strong><small>${scenario.desc}</small></button>`).join('')}</div><div class="p0-actions"><button class="p0-link" id="p0-back" type="button">Kembali ke peran</button></div>`;
    content.querySelectorAll('[data-scenario]').forEach((choice) => {
      choice.onclick = () => {
        state.scenario = choice.dataset.scenario;
        state.outcome = '';
        state.detail = '';
        renderPlayable();
      };
    });
    content.querySelector('#p0-back').onclick = renderRole;
    focusContent();
  }

  function journeyPath() {
    const role = roles[state.role];
    return `<div class="p0-path" aria-label="Journey ${role.label}">${role.path.map((item, index) => `${index ? '<i aria-hidden="true">→</i>' : ''}<span${index === 2 ? ' class="active"' : ''}>${item}</span>`).join('')}</div>`;
  }

  function newStudentWorkspace() {
    return `<form class="p0-form" id="p0-new-student-form" novalidate><label for="p0-student-name">Nama santri</label><input id="p0-student-name" name="name" value="Alya Rahma" required><label for="p0-student-class">Kelas yang disarankan</label><select id="p0-student-class" name="class"><option>Tahsin Dasar A</option><option>Tahfidz Juz 30</option><option>Kelas Qur'an Anak</option></select><p class="p0-error" id="p0-form-error" hidden></p><button class="btn btn-primary" type="submit">Tambahkan ke simulasi <span aria-hidden="true">→</span></button></form>`;
  }

  function attendanceWorkspace() {
    const students = ['Alya Rahma', 'Fajar Hidayat', 'Nabila Aulia', 'Rafi Akbar'];
    return `<div class="p0-roster" id="p0-attendance-list">${students.map((name, index) => `<div class="p0-roster-row"><span><strong>${name}</strong><small>Tahsin Dasar A</small></span><span class="p0-statuses" data-student="${name}">${['Hadir', 'Izin', 'Absen'].map((status) => `<button type="button" data-status="${status}"${status === (index === 3 ? 'Absen' : 'Hadir') ? ' class="selected" aria-pressed="true"' : ' aria-pressed="false"'}>${status}</button>`).join('')}</span></div>`).join('')}</div><div class="p0-actions">${primaryButton('Simpan simulasi', 'p0-save-attendance')}</div>`;
  }

  function progressWorkspace() {
    return `<form class="p0-form" id="p0-progress-form"><label for="p0-progress-student">Santri</label><select id="p0-progress-student" name="student"><option>Nabila Aulia</option><option>Fajar Hidayat</option><option>Alya Rahma</option></select><label for="p0-progress-level">Capaian pekan ini</label><select id="p0-progress-level" name="level"><option>Lancar dengan sedikit koreksi</option><option>Perlu pengulangan</option><option>Siap naik materi</option></select><label for="p0-progress-note">Catatan singkat</label><textarea id="p0-progress-note" name="note" rows="2">Makhraj huruf ra perlu dilatih kembali.</textarea><button class="btn btn-primary" type="submit">Catat progres simulasi <span aria-hidden="true">→</span></button></form>`;
  }

  function agendaWorkspace() {
    const agendas = [
      ['07', 'Setoran Hafalan', 'Hari ini · 16.00 WIB'],
      ['10', "Kelas Qur'an Anak", 'Kamis · 15.30 WIB'],
      ['14', "Kajian Qur'ani", 'Senin · 19.30 WIB'],
    ];
    return `<div class="p0-agenda-list">${agendas.map(([date, title, time]) => `<button class="p0-agenda-item" type="button" data-agenda="${title}" aria-pressed="false"><b>${date}</b><span><strong>${title}</strong><small>${time}</small></span></button>`).join('')}</div><div class="p0-actions">${primaryButton('Tetapkan prioritas', 'p0-save-agenda', true)}</div>`;
  }

  function scenarioWorkspace() {
    if (state.scenario === 'new') return newStudentWorkspace();
    if (state.scenario === 'attendance') return attendanceWorkspace();
    if (state.scenario === 'progress') return progressWorkspace();
    return agendaWorkspace();
  }

  function bindPlayableActions() {
    if (state.scenario === 'new') {
      content.querySelector('#p0-new-student-form').onsubmit = (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const name = String(data.get('name') || '').trim();
        const selectedClass = String(data.get('class') || '');
        const error = content.querySelector('#p0-form-error');
        if (name.length < 3) {
          error.textContent = 'Masukkan nama santri minimal 3 karakter.';
          error.hidden = false;
          content.querySelector('#p0-student-name').focus();
          return;
        }
        state.outcome = `${name} siap ditinjau sebagai santri baru.`;
        state.detail = `Kelas usulan: ${selectedClass} · Status: Menunggu konfirmasi`;
        renderResult();
      };
    }

    if (state.scenario === 'attendance') {
      content.querySelectorAll('.p0-statuses button').forEach((button) => {
        button.onclick = () => {
          const group = button.closest('.p0-statuses');
          group.querySelectorAll('button').forEach((item) => {
            const selected = item === button;
            item.classList.toggle('selected', selected);
            item.setAttribute('aria-pressed', String(selected));
          });
        };
      });
      content.querySelector('#p0-save-attendance').onclick = () => {
        const statuses = [...content.querySelectorAll('.p0-statuses')].map((group) => group.querySelector('.selected')?.dataset.status || 'Belum diisi');
        const counts = statuses.reduce((summary, status) => ({ ...summary, [status]: (summary[status] || 0) + 1 }), {});
        state.outcome = `${counts.Hadir || 0} hadir · ${counts.Izin || 0} izin · ${counts.Absen || 0} absen.`;
        state.detail = counts.Absen ? `${counts.Absen} santri perlu ditindaklanjuti.` : 'Tidak ada santri yang memerlukan tindak lanjut kehadiran.';
        renderResult();
      };
    }

    if (state.scenario === 'progress') {
      content.querySelector('#p0-progress-form').onsubmit = (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const student = String(data.get('student'));
        const level = String(data.get('level'));
        state.outcome = `Progres ${student} tercatat dalam simulasi.`;
        state.detail = `${level} · Catatan hanya tersimpan selama alur demo.`;
        renderResult();
      };
    }

    if (state.scenario === 'agenda') {
      const save = content.querySelector('#p0-save-agenda');
      content.querySelectorAll('[data-agenda]').forEach((button) => {
        button.onclick = () => {
          content.querySelectorAll('[data-agenda]').forEach((item) => {
            const selected = item === button;
            item.classList.toggle('selected', selected);
            item.setAttribute('aria-pressed', String(selected));
          });
          save.disabled = false;
        };
      });
      save.onclick = () => {
        const selected = content.querySelector('[data-agenda].selected')?.dataset.agenda;
        state.outcome = `${selected} ditandai sebagai agenda prioritas.`;
        state.detail = 'Pengelola dapat melihat kegiatan yang perlu dipersiapkan lebih dahulu.';
        renderResult();
      };
    }
  }

  function renderPlayable() {
    setProgress(2);
    const role = roles[state.role];
    const scenario = scenarios[state.scenario];
    content.innerHTML = `${stepHeader(3)}<h2 id="p0-title">${scenario.title}</h2><p class="p0-lead">${scenario.desc}</p>${journeyPath()}<div class="p0-workspace"><section class="p0-panel"><span class="p0-panel-label">Simulasi interaktif · ${role.label}</span>${scenarioWorkspace()}</section><aside class="p0-result"><small>Mengapa ini penting?</small><strong>${role.question}</strong><p class="p0-lead">Mainkan satu tindakan untuk melihat hasil yang dapat dibahas bersama lembaga.</p></aside></div><div class="p0-actions"><button class="p0-link" id="p0-back" type="button">Ganti skenario</button></div>`;
    bindPlayableActions();
    content.querySelector('#p0-back').onclick = renderScenario;
    focusContent();
  }

  function renderResult() {
    setProgress(3);
    const role = roles[state.role];
    const scenario = scenarios[state.scenario];
    content.innerHTML = `${stepHeader(4)}<h2 id="p0-title">Hasil yang terlihat jelas.</h2><p class="p0-lead">Ini adalah hasil simulasi, bukan catatan production. Gunakan hasil ini untuk menilai data dan tindakan yang benar-benar dibutuhkan.</p>${journeyPath()}<div class="p0-result"><small>Hasil skenario ${scenario.label}</small><strong>${escapeHtml(state.outcome || scenario.result)}</strong><p class="p0-lead">${escapeHtml(state.detail)}</p></div><div class="p0-note"><strong>Sudut pandang ${role.label}:</strong> ${role.question}</div><div class="p0-actions">${primaryButton('Lanjut ke Feedback', 'p0-feedback-next')}<button class="p0-link" id="p0-replay" type="button">Ulangi langkah</button></div>`;
    content.querySelector('#p0-feedback-next').onclick = renderFeedback;
    content.querySelector('#p0-replay').onclick = renderPlayable;
    focusContent();
  }

  function renderFeedback() {
    setProgress(4);
    content.innerHTML = `${stepHeader(5)}<h2 id="p0-title">Apakah alur ini sesuai dengan cara kerja lembaga Anda?</h2><p class="p0-lead">Pilih respons yang paling dekat. Masukan hanya disimpan di sessionStorage browser dan tidak dikirim ke server.</p><div class="p0-feedback"><button type="button" data-feedback="Sangat relevan">Sangat relevan</button><button type="button" data-feedback="Cukup relevan">Cukup relevan</button><button type="button" data-feedback="Belum sesuai">Belum sesuai</button><button type="button" data-feedback="Kebutuhan lain">Kebutuhan lain</button></div><div class="p0-note">Pertanyaan lanjutan: bagian mana yang membantu, tidak sesuai, atau masih belum tersedia?</div><div class="p0-actions"><button class="p0-link" id="p0-change-scenario" type="button">Coba skenario lain</button></div>`;
    content.querySelectorAll('[data-feedback]').forEach((button) => {
      button.onclick = () => {
        try {
          sessionStorage.setItem('qima-demo-feedback', JSON.stringify({
            role: roles[state.role].label,
            scenario: scenarios[state.scenario].label,
            answer: button.dataset.feedback,
          }));
        } catch {
          // The validation flow still works when browser storage is unavailable.
        }
        renderComplete(button.dataset.feedback);
      };
    });
    content.querySelector('#p0-change-scenario').onclick = renderScenario;
    focusContent();
  }

  function renderComplete(feedback) {
    const scenario = scenarios[state.scenario];
    content.innerHTML = `<div class="p0-complete" aria-hidden="true">✓</div>${stepHeader(5)}<h2 id="p0-title">Terima kasih. Demo selesai.</h2><p class="p0-lead">Masukan <strong>“${escapeHtml(feedback)}”</strong> tercatat hanya untuk sesi browser ini. Ini adalah bahan percakapan validasi, bukan bukti bahwa kebutuhan pasar sudah tervalidasi.</p><div class="p0-result"><small>Alur yang baru dimainkan</small><strong>${roles[state.role].label} · ${scenario.label}</strong><p class="p0-lead">${escapeHtml(state.outcome || scenario.result)}</p></div><div class="p0-actions"><a class="btn btn-primary" href="${scenario.href}" id="p0-continue">${scenario.action} <span aria-hidden="true">→</span></a><button class="p0-link" id="p0-restart" type="button">Ulangi dari awal</button><button class="p0-link" id="p0-finish" type="button">Selesai</button></div>`;
    content.querySelector('#p0-restart').onclick = () => {
      state.role = null;
      state.scenario = null;
      state.outcome = '';
      state.detail = '';
      renderRole();
    };
    content.querySelector('#p0-finish').onclick = close;
    focusContent();
  }

  const launch = document.createElement('button');
  launch.type = 'button';
  launch.className = 'btn btn-primary btn-small p0-launch';
  launch.textContent = 'Mulai Demo';
  launch.id = 'p0-launch';
  document.querySelector('.hero-actions')?.appendChild(launch);
  launch.onclick = open;

  modal.querySelector('#p0-close').onclick = close;
  modal.querySelector('#p0-skip-tour').onclick = close;
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });
  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])')]
      .filter((element) => element.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  let autoShown = false;
  try {
    autoShown = sessionStorage.getItem('qima-p0-onboarding-seen') === '1';
  } catch {
    // Show onboarding when browser storage is unavailable.
  }
  if (!autoShown) {
    setTimeout(() => {
      if (!modal.hidden) return;
      try {
        sessionStorage.setItem('qima-p0-onboarding-seen', '1');
      } catch {
        // The demo remains usable without persistence.
      }
      open();
    }, 450);
  }
})();
