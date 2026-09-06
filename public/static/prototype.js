const programs = [
  {
    id: '01',
    icon: 'ت',
    title: 'Tahsin & Tahfidz',
    desc: 'Perjalanan memperbaiki bacaan dan menguatkan hafalan bersama pembimbing.',
    meta: '12 pertemuan',
    schedule: 'Senin & Kamis · 16.00 WIB',
    capacity: '20 peserta',
    level: 'Pemula — Menengah',
  },
  {
    id: '02',
    icon: 'ق',
    title: "Kelas Qur'an Anak",
    desc: "Belajar Al-Qur'an dengan metode yang menyenangkan, bertahap, dan dekat dengan anak.",
    meta: '8 pertemuan',
    schedule: 'Sabtu · 09.00 WIB',
    capacity: '15 peserta',
    level: 'Anak 6–12 tahun',
  },
  {
    id: '03',
    icon: '✦',
    title: "Kajian Qur'ani",
    desc: "Ruang belajar memahami nilai Al-Qur'an dan membawanya ke kehidupan sehari-hari.",
    meta: 'Pekan ke-2 & 4',
    schedule: 'Jumat · 19.30 WIB',
    capacity: 'Terbuka',
    level: 'Umum',
  },
];

const units = {
  rq: {
    short: 'RQ Blumbang',
    name: "Rumah Qur'an Blumbang",
    mark: 'RQ',
  },
  qima: {
    short: 'QIMA Platform',
    name: 'QIMA Platform',
    mark: 'Q',
  },
};

const grid = document.querySelector('#program-grid');
const flow = document.querySelector('#demo-flow');
const flowContent = document.querySelector('#flow-content');
const unitModal = document.querySelector('#unit-modal');
const unitSwitcher = document.querySelector('#unit-switcher');
const toastElement = document.querySelector('#toast');
const menuButton = document.querySelector('#menu-button');
const navigation = document.querySelector('#public-navigation');
let toastTimer;
let lastFocusedElement;

function getStoredUnit() {
  try {
    return sessionStorage.getItem('qima-demo-unit');
  } catch {
    return null;
  }
}

function storeUnit(key) {
  try {
    sessionStorage.setItem('qima-demo-unit', key);
  } catch {
    // The demo remains usable when browser storage is unavailable.
  }
}

function trapDialogFocus(event, container) {
  if (event.key !== 'Tab' || !container || container.hidden) return;
  const focusable = [...container.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hidden && element.getClientRects().length > 0);
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
}

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = value;
  return element.innerHTML;
}

function showToast(message) {
  if (!toastElement) return;
  toastElement.textContent = message;
  toastElement.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastElement.classList.remove('show'), 2800);
}

function setDialogOpen(container, open, trigger) {
  if (!container) return;
  if (open) {
    lastFocusedElement = trigger || document.activeElement;
    container.hidden = false;
    document.body.classList.add('flow-open');
    requestAnimationFrame(() => container.querySelector('button, a, input, textarea')?.focus());
  } else {
    container.hidden = true;
    if (container === unitModal) unitSwitcher?.setAttribute('aria-expanded', 'false');
    if (!document.querySelector('.modal-backdrop:not([hidden]), .demo-flow-modal:not([hidden])')) {
      document.body.classList.remove('flow-open');
    }
    lastFocusedElement?.focus?.();
  }
}

function updateUnit(key, announce = true) {
  const unit = units[key];
  if (!unit) return;
  storeUnit(key);
  document.querySelector('#unit-label').textContent = unit.short;
  document.querySelector('#hero-unit').textContent = unit.name;
  document.querySelector('.mini-brand').textContent = unit.mark;
  document.querySelectorAll('[data-unit-short]').forEach((element) => { element.textContent = unit.short; });
  document.querySelectorAll('[data-unit-name]').forEach((element) => { element.textContent = unit.name; });
  document.querySelectorAll('#unit-modal .unit-option').forEach((button) => {
    const active = button.dataset.unit === key;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    const indicator = button.querySelector('i');
    if (indicator) indicator.textContent = active ? '✓' : '○';
  });
  if (!unitModal?.hidden) setDialogOpen(unitModal, false);
  unitSwitcher?.setAttribute('aria-expanded', 'false');
  if (announce) showToast(`Konteks berubah ke ${unit.short}. Core aplikasi tetap sama.`);
}

function renderPrograms() {
  if (!grid) return;
  grid.innerHTML = programs.map((program, index) => `
    <article class="program-card">
      <div class="program-card-top"><span class="program-icon" aria-hidden="true">${program.icon}</span><span class="program-number">0${index + 1}</span></div>
      <div><span class="program-type">Program pembelajaran</span><h3>${program.title}</h3><p>${program.desc}</p></div>
      <footer><span>${program.meta}</span><button class="program-card-action" type="button" data-program="${program.id}" aria-label="Lihat detail ${program.title}">Lihat detail <span aria-hidden="true">→</span></button></footer>
    </article>`).join('');

  document.querySelectorAll('.program-card-action').forEach((button) => {
    button.addEventListener('click', () => {
      const program = programs.find((item) => item.id === button.dataset.program);
      if (program) renderDetail(program);
    });
  });
}

function setFlowStep(step) {
  const labels = flow?.querySelectorAll('.demo-progress span');
  labels?.forEach((label, index) => label.classList.toggle('done', index <= step));
}

function openFlow() {
  setDialogOpen(flow, true, document.activeElement);
}

function closeFlow() {
  setDialogOpen(flow, false);
}

function renderDetail(program) {
  openFlow();
  setFlowStep(0);
  const activeUnit = document.querySelector('#unit-label')?.textContent || 'RQ Blumbang';
  flowContent.innerHTML = `
    <span class="eyebrow">PROGRAM · <span data-flow-unit>${activeUnit.toUpperCase()}</span></span>
    <h2 id="flow-title">${program.title}</h2>
    <p class="flow-lead">${program.desc}</p>
    <div class="flow-meta">
      <div><small>Jadwal</small><strong>${program.schedule}</strong></div>
      <div><small>Kapasitas</small><strong>${program.capacity}</strong></div>
      <div><small>Level</small><strong>${program.level}</strong></div>
    </div>
    <div class="flow-notice"><span aria-hidden="true">ⓘ</span><p>Detail ini menggunakan data statis untuk memperlihatkan alur sebelum integrasi API production.</p></div>
    <div class="flow-actions"><button class="btn btn-primary" id="flow-register" type="button">Daftar ke program ini <span aria-hidden="true">→</span></button><button class="text-link" id="flow-back" type="button">Pilih program lain</button></div>`;
  document.querySelector('#flow-register')?.addEventListener('click', () => renderRegistration(program));
  document.querySelector('#flow-back')?.addEventListener('click', closeFlow);
}

function renderRegistration(program) {
  setFlowStep(1);
  flowContent.innerHTML = `
    <span class="eyebrow">REGISTRATION DEMO</span>
    <h2 id="flow-title">Daftar ke ${program.title}</h2>
    <p class="flow-lead">Lengkapi data berikut untuk melihat simulasi hasil pendaftaran. Tidak ada data yang dikirim ke server.</p>
    <form class="demo-form" id="demo-registration-form" novalidate>
      <div class="selected-program"><span class="program-icon small" aria-hidden="true">${program.icon}</span><span><small>PROGRAM DIPILIH</small><strong>${program.title}</strong></span></div>
      <label for="registration-name">Nama lengkap <span aria-hidden="true">*</span></label>
      <input id="registration-name" name="name" autocomplete="name" placeholder="Contoh: Ahmad Rizky" required aria-describedby="name-error">
      <small class="field-help">Gunakan nama peserta yang akan mengikuti program.</small><p class="field-error" id="name-error" hidden></p>
      <label for="registration-contact">WhatsApp atau email <span aria-hidden="true">*</span></label>
      <input id="registration-contact" name="contact" autocomplete="email" placeholder="08xx atau nama@email.com" required aria-describedby="contact-help contact-error">
      <small class="field-help" id="contact-help">Digunakan unit untuk tindak lanjut pada sistem production.</small><p class="field-error" id="contact-error" hidden></p>
      <label for="registration-note">Catatan <span class="optional">Opsional</span></label>
      <textarea id="registration-note" name="note" rows="3" placeholder="Ceritakan kebutuhan belajar atau pertanyaan Anda"></textarea>
      <button class="btn btn-primary submit-button" type="submit">Kirim Pendaftaran Demo <span aria-hidden="true">→</span></button>
      <p class="form-disclaimer">Dengan melanjutkan, Anda hanya menjalankan simulasi lokal pada browser ini.</p>
    </form>`;

  const form = document.querySelector('#demo-registration-form');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const contact = String(data.get('contact') || '').trim();
    const nameError = document.querySelector('#name-error');
    const contactError = document.querySelector('#contact-error');
    let valid = true;

    [nameError, contactError].forEach((element) => { if (element) element.hidden = true; });
    form.querySelectorAll('[aria-invalid="true"]').forEach((element) => element.removeAttribute('aria-invalid'));

    if (name.length < 3) {
      nameError.textContent = 'Masukkan nama lengkap minimal 3 karakter.';
      nameError.hidden = false;
      form.elements.name.setAttribute('aria-invalid', 'true');
      valid = false;
    }
    if (contact.length < 6) {
      contactError.textContent = 'Masukkan nomor WhatsApp atau email yang valid.';
      contactError.hidden = false;
      form.elements.contact.setAttribute('aria-invalid', 'true');
      valid = false;
    }
    if (!valid) {
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.innerHTML = '<span class="button-spinner" aria-hidden="true"></span>Memproses simulasi…';
    setTimeout(() => renderSuccess(program, name), 500);
  });
}

function renderSuccess(program, name) {
  setFlowStep(1);
  const activeUnitName = document.querySelector('#hero-unit')?.textContent || "Rumah Qur'an Blumbang";
  flowContent.innerHTML = `
    <div class="success-mark" aria-hidden="true">✓</div>
    <span class="eyebrow">SIMULASI BERHASIL</span>
    <h2 id="flow-title">Terima kasih, ${escapeHtml(name)}.</h2>
    <p class="flow-lead">Alur pendaftaran untuk <strong>${program.title}</strong> selesai. Pada production, data akan masuk ke inbox admin unit untuk ditinjau.</p>
    <div class="success-summary"><span>Status</span><strong><i class="status-dot"></i> Menunggu ditinjau</strong><span>Unit</span><strong>${activeUnitName}</strong><span>Penyimpanan</span><strong>Tidak disimpan · Demo</strong></div>
    <div class="flow-actions"><a class="btn btn-primary" href="/demo/admin/login">Lanjut ke Admin Demo <span aria-hidden="true">→</span></a><button class="text-link" id="flow-done" type="button">Kembali ke Public</button></div>`;
  document.querySelector('#flow-done')?.addEventListener('click', closeFlow);
}

renderPrograms();
updateUnit(getStoredUnit() === 'qima' ? 'qima' : 'rq', false);

document.querySelectorAll('[data-toast]').forEach((button) => button.addEventListener('click', () => showToast(button.dataset.toast)));

unitSwitcher?.addEventListener('click', () => {
  unitSwitcher.setAttribute('aria-expanded', 'true');
  setDialogOpen(unitModal, true, unitSwitcher);
});
document.querySelector('#about-unit-switcher')?.addEventListener('click', () => setDialogOpen(unitModal, true, document.querySelector('#about-unit-switcher')));
document.querySelector('#unit-close')?.addEventListener('click', () => {
  unitSwitcher?.setAttribute('aria-expanded', 'false');
  setDialogOpen(unitModal, false);
});
unitModal?.addEventListener('click', (event) => {
  if (event.target === unitModal) setDialogOpen(unitModal, false);
});
document.querySelectorAll('#unit-modal .unit-option').forEach((button) => button.addEventListener('click', () => updateUnit(button.dataset.unit)));

document.querySelector('#register-button')?.addEventListener('click', () => renderDetail(programs[0]));
document.querySelector('#flow-close')?.addEventListener('click', closeFlow);
flow?.addEventListener('click', (event) => { if (event.target === flow) closeFlow(); });

document.querySelector('.header-actions .btn')?.addEventListener('click', (event) => {
  event.preventDefault();
  document.querySelector('#register')?.scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => renderDetail(programs[0]), 350);
});

menuButton?.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Tutup navigasi' : 'Buka navigasi');
});
navigation?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  document.body.classList.remove('menu-open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));

document.addEventListener('keydown', (event) => {
  const activeDialog = flow && !flow.hidden ? flow : unitModal && !unitModal.hidden ? unitModal : null;
  if (event.key === 'Tab' && activeDialog) {
    trapDialogFocus(event, activeDialog);
    return;
  }
  if (event.key !== 'Escape') return;
  if (flow && !flow.hidden) closeFlow();
  else if (unitModal && !unitModal.hidden) setDialogOpen(unitModal, false);
  else if (document.body.classList.contains('menu-open')) {
    document.body.classList.remove('menu-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.focus();
  }
});
