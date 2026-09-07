const demoRows = {
  programs: [
    ['Tahsin & Tahfidz', '42 peserta', 'Senin & Kamis', 'Aktif'],
    ["Kelas Qur'an Anak", '31 peserta', 'Sabtu', 'Aktif'],
    ["Kajian Qur'ani", '55 peserta', 'Jumat', 'Aktif'],
  ],
  registrations: [
    ['Ahmad Rizky', 'Tahsin & Tahfidz', '06 Sep 2026', 'Menunggu'],
    ['Nabila Aulia', "Kelas Qur'an Anak", '05 Sep 2026', 'Diterima'],
    ['Fajar Hidayat', 'Tahsin & Tahfidz', '05 Sep 2026', 'Diterima'],
    ['Siti Rahma', "Kajian Qur'ani", '04 Sep 2026', 'Menunggu'],
    ['Dimas Pratama', 'Tahsin & Tahfidz', '03 Sep 2026', 'Diterima'],
  ],
  activities: [
    ['Setoran Hafalan', '07 Sep · 16.00', '28 peserta', 'Terjadwal'],
    ["Kelas Qur'an Anak", '10 Sep · 15.30', '31 peserta', 'Terjadwal'],
    ["Kajian Qur'ani", '14 Sep · 19.30', '55 peserta', 'Terjadwal'],
  ],
  participants: [
    ['Ahmad Rizky', 'Tahsin & Tahfidz', 'Bergabung 2026', 'Aktif'],
    ['Nabila Aulia', "Kelas Qur'an Anak", 'Bergabung 2025', 'Aktif'],
    ['Fajar Hidayat', 'Tahsin & Tahfidz', 'Bergabung 2026', 'Aktif'],
    ['Siti Rahma', "Kajian Qur'ani", 'Bergabung 2025', 'Aktif'],
  ],
};

const viewConfig = {
  programs: {
    eyebrow: 'PROGRAM MANAGEMENT',
    title: 'Program',
    description: 'Pantau program pembelajaran pada unit aktif.',
    action: '+ Program Baru',
    toast: 'Form Program Baru tersedia setelah integrasi production.',
    columns: ['Program', 'Peserta', 'Jadwal', 'Status'],
  },
  registrations: {
    eyebrow: 'REGISTRATION INBOX',
    title: 'Pendaftaran',
    description: 'Tinjau calon peserta dari pengalaman public.',
    action: 'Filter',
    toast: 'Filter pendaftaran aktif pada versi production.',
    columns: ['Nama', 'Program', 'Tanggal', 'Status'],
  },
  activities: {
    eyebrow: 'ACTIVITY MANAGEMENT',
    title: 'Aktivitas',
    description: 'Lihat agenda unit yang akan datang.',
    action: '+ Aktivitas',
    toast: 'Form Aktivitas tersedia setelah integrasi production.',
    columns: ['Agenda', 'Waktu', 'Peserta', 'Status'],
  },
  participants: {
    eyebrow: 'PARTICIPANT DIRECTORY',
    title: 'Peserta',
    description: 'Direktori peserta aktif pada unit demo.',
    action: '+ Peserta',
    toast: 'Penambahan peserta tersedia setelah integrasi production.',
    columns: ['Nama', 'Program', 'Keaktifan', 'Status'],
  },
};

const dashboard = document.querySelector('#admin-dashboard');
const tableView = document.querySelector('#admin-table-view');
const unitModal = document.querySelector('#admin-unit-modal');
const unitSwitcher = document.querySelector('#admin-unit-switcher');
const toastElement = document.querySelector('#toast');
const sidebar = document.querySelector('#admin-sidebar');
const menuButton = document.querySelector('#admin-menu');
const sidebarScrim = document.querySelector('#sidebar-scrim');
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
  const focusable = [...container.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
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

function showToast(message) {
  if (!toastElement) return;
  toastElement.textContent = message;
  toastElement.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastElement.classList.remove('show'), 2600);
}

function statusClass(value) {
  if (value === 'Menunggu') return 'pending';
  if (value === 'Diterima' || value === 'Aktif' || value === 'Terjadwal') return 'approved';
  return 'neutral';
}

function renderNextAction() {
  if (!dashboard || dashboard.querySelector('#admin-next-action')) return;
  const panel = document.createElement('article');
  panel.className = 'admin-panel';
  panel.id = 'admin-next-action';
  panel.innerHTML = `
    <div class="panel-head">
      <div><span class="eyebrow">NEXT ACTION</span><h2>Yang perlu Anda kerjakan sekarang</h2></div>
      <span class="status pending">2 item</span>
    </div>
    <div class="data-list">
      <div>
        <span class="avatar mini" aria-hidden="true">AR</span>
        <div><strong>2 pendaftaran menunggu</strong><small>Ahmad Rizky · Siti Rahma perlu ditinjau sebelum ditempatkan.</small></div>
        <button type="button" data-view-target="registrations">Tinjau sekarang <span aria-hidden="true">→</span></button>
      </div>
      <div>
        <span class="avatar mini" aria-hidden="true">SH</span>
        <div><strong>Agenda berikutnya hari ini</strong><small>Setoran Hafalan · 07 Sep · 16.00 WIB · 28 peserta.</small></div>
        <button type="button" data-view-target="activities">Buka agenda <span aria-hidden="true">→</span></button>
      </div>
    </div>`;
  const stats = dashboard.querySelector('.stat-grid');
  if (stats) stats.insertAdjacentElement('afterend', panel);
  else dashboard.prepend(panel);
  bindDynamicButtons();
}

function renderView(key) {
  if (key === 'dashboard') {
    tableView.hidden = true;
    dashboard.hidden = false;
    document.title = 'QIMA — Admin Demo';
    renderNextAction();
    closeSidebar();
    return;
  }

  const config = viewConfig[key];
  if (!config) return;
  dashboard.hidden = true;
  tableView.hidden = false;
  document.title = `${config.title} · QIMA Admin Demo`;
  tableView.innerHTML = `
    <div class="admin-heading"><div><span class="eyebrow">${config.eyebrow}</span><h1>${config.title}</h1><p>${config.description}</p></div><button class="admin-primary" type="button" data-toast="${config.toast}">${config.action}</button></div>
    <div class="list-toolbar"><label for="table-search">Cari ${config.title.toLowerCase()}<input id="table-search" type="search" placeholder="Ketik kata kunci…"></label><span>${demoRows[key].length} data demo</span></div>
    <div class="admin-panel table-panel" role="region" aria-label="Daftar ${config.title}" tabindex="0">
      <div role="table" aria-label="Data ${config.title}">
        <div class="table-row table-head" role="row">${config.columns.map((column) => `<span role="columnheader">${column}</span>`).join('')}</div>
        <div id="table-body" role="rowgroup">${renderRows(demoRows[key])}</div>
      </div>
      <div class="empty-state" id="table-empty" hidden><span aria-hidden="true">⌕</span><h2>Tidak ada hasil</h2><p>Coba kata kunci lain pada data demo ini.</p></div>
    </div>`;

  bindDynamicButtons();
  const search = document.querySelector('#table-search');
  search?.addEventListener('input', () => {
    const query = search.value.toLowerCase().trim();
    const filtered = demoRows[key].filter((row) => row.join(' ').toLowerCase().includes(query));
    document.querySelector('#table-body').innerHTML = renderRows(filtered);
    document.querySelector('#table-empty').hidden = filtered.length > 0;
  });
  search?.focus();
  closeSidebar();
}

function renderRows(rows) {
  return rows.map((row) => `<div class="table-row" role="row"><strong role="cell">${row[0]}</strong><span role="cell">${row[1]}</span><span role="cell">${row[2]}</span><em role="cell" class="status ${statusClass(row[3])}">${row[3]}</em></div>`).join('');
}

function setActiveNavigation(key) {
  document.querySelectorAll('.admin-nav [data-view]').forEach((button) => {
    const active = button.dataset.view === key;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}

function showView(key) {
  setActiveNavigation(key);
  renderView(key);
}

function bindDynamicButtons() {
  document.querySelectorAll('[data-view-target]').forEach((button) => {
    button.onclick = () => showView(button.dataset.viewTarget);
  });
  document.querySelectorAll('[data-toast]').forEach((button) => {
    button.onclick = () => showToast(button.dataset.toast);
  });
}

function setUnitModal(open, trigger) {
  if (!unitModal) return;
  if (open) {
    lastFocusedElement = trigger || document.activeElement;
    unitModal.hidden = false;
    document.body.classList.add('flow-open');
    unitSwitcher?.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => unitModal.querySelector('button')?.focus());
  } else {
    unitModal.hidden = true;
    document.body.classList.remove('flow-open');
    unitSwitcher?.setAttribute('aria-expanded', 'false');
    lastFocusedElement?.focus?.();
  }
}

function updateUnit(key, announce = true) {
  const qima = key === 'qima';
  storeUnit(key);
  const shortName = qima ? 'QIMA Platform' : 'RQ Blumbang';
  const fullName = qima ? 'QIMA Platform' : "Rumah Qur'an Blumbang";
  document.querySelectorAll('[data-admin-unit-short]').forEach((element) => { element.textContent = shortName; });
  document.querySelectorAll('[data-admin-unit-name]').forEach((element) => { element.textContent = fullName; });
  document.querySelector('#admin-unit-label').textContent = fullName;
  document.querySelectorAll('#admin-unit-modal .unit-option').forEach((button) => {
    const active = button.dataset.unit === key;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    const indicator = button.querySelector('i');
    if (indicator) indicator.textContent = active ? '✓' : '○';
  });
  if (!unitModal?.hidden) setUnitModal(false);
  if (announce) showToast(`Konteks berubah ke ${shortName}. Data tetap berupa simulasi.`);
}

function openSidebar() {
  document.body.classList.add('admin-nav-open');
  sidebarScrim.hidden = false;
  menuButton.setAttribute('aria-expanded', 'true');
  menuButton.setAttribute('aria-label', 'Tutup navigasi admin');
  sidebar.querySelector('button, a')?.focus();
}

function closeSidebar() {
  document.body.classList.remove('admin-nav-open');
  sidebarScrim.hidden = true;
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.setAttribute('aria-label', 'Buka navigasi admin');
}

document.querySelectorAll('.admin-nav [data-view]').forEach((button) => {
  button.addEventListener('click', () => showView(button.dataset.view));
});
bindDynamicButtons();
updateUnit(getStoredUnit() === 'qima' ? 'qima' : 'rq', false);
renderNextAction();

unitSwitcher?.addEventListener('click', () => setUnitModal(true, unitSwitcher));
document.querySelector('#context-switch-action')?.addEventListener('click', () => setUnitModal(true, document.querySelector('#context-switch-action')));
document.querySelector('#admin-unit-close')?.addEventListener('click', () => setUnitModal(false));
unitModal?.addEventListener('click', (event) => { if (event.target === unitModal) setUnitModal(false); });
document.querySelectorAll('#admin-unit-modal .unit-option').forEach((button) => button.addEventListener('click', () => updateUnit(button.dataset.unit)));

menuButton?.addEventListener('click', () => {
  if (document.body.classList.contains('admin-nav-open')) closeSidebar();
  else openSidebar();
});
sidebarScrim?.addEventListener('click', closeSidebar);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Tab' && unitModal && !unitModal.hidden) {
    trapDialogFocus(event, unitModal);
    return;
  }
  if (event.key !== 'Escape') return;
  if (unitModal && !unitModal.hidden) setUnitModal(false);
  else if (document.body.classList.contains('admin-nav-open')) {
    closeSidebar();
    menuButton?.focus();
  }
});
