(function initParticipants() {
  'use strict';

  var root = document.documentElement;
  var mode = root.getAttribute('data-participant-mode') || 'list';
  var participantId = root.getAttribute('data-participant-id') || '';
  var form = document.getElementById('scope-form');
  var state = document.getElementById('participant-state');
  var content = document.getElementById('participant-content');
  var tokenInput = document.getElementById('access-token');
  var organizationInput = document.getElementById('organization-id');
  var unitInput = document.getElementById('unit-id');

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function scope() {
    return { token: tokenInput.value.trim(), organizationId: organizationInput.value.trim(), unitId: unitInput.value.trim() };
  }

  function saveScope(values) {
    sessionStorage.setItem('qima-participant-token', values.token);
    sessionStorage.setItem('qima-participant-organization', values.organizationId);
    sessionStorage.setItem('qima-participant-unit', values.unitId);
  }

  function apiPath(id) {
    var values = scope();
    var query = new URLSearchParams({ organization_id: values.organizationId, unit_id: values.unitId });
    if (!id && mode === 'list') {
      var pageQuery = new URLSearchParams(window.location.search);
      ['page', 'search', 'status'].forEach(function include(name) {
        var value = pageQuery.get(name);
        if (value) query.set(name, value);
      });
    }
    return '/api/v1/participants' + (id ? '/' + encodeURIComponent(id) : '') + '?' + query.toString();
  }

  function request(id, options) {
    var config = options || {};
    config.headers = Object.assign(
      { accept: 'application/json', authorization: 'Bearer ' + scope().token },
      config.headers || {},
    );
    return fetch(apiPath(id), config).then(function parse(response) {
      return response.json().then(function body(payload) {
        if (!response.ok || !payload.ok) {
          var error = new Error(payload && payload.error ? payload.error.message : 'Permintaan gagal.');
          error.status = response.status;
          throw error;
        }
        return payload.data;
      });
    });
  }

  function setError(error) {
    var heading = error.status === 401 || error.status === 403
      ? 'Akses tidak diizinkan'
      : error.status === 404 ? 'Peserta tidak ditemukan' : 'Data belum dapat dimuat';
    content.innerHTML = '<h2>' + heading + '</h2><p class="state-error" role="alert">' +
      escapeHtml(error.message || 'Data belum dapat dimuat.') + '</p><button id="retry-button" type="button">Coba lagi</button>';
    document.getElementById('retry-button').addEventListener('click', load);
  }

  function renderList(data) {
    var query = new URLSearchParams(window.location.search);
    var search = query.get('search') || '';
    var status = query.get('status') || '';
    var filters = '<form id="participant-filter" class="filter-bar"><label>Cari<input name="search" type="search" maxlength="200" value="' +
      escapeHtml(search) + '" placeholder="Nama, email, atau telepon"></label><label>Status<select name="status">' +
      '<option value="">Semua status</option><option value="active">Active</option><option value="inactive">Inactive</option>' +
      '</select></label><button type="submit">Terapkan</button></form>';
    var body = data.items.length
      ? '<div class="table-wrap"><table><thead><tr><th>Peserta</th><th>Kontak</th><th>Tanggal Lahir</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
        data.items.map(function row(item) {
          return '<tr><td>' + escapeHtml(item.name) + '</td><td>' + escapeHtml(item.email || item.phone || '—') +
            '</td><td>' + escapeHtml(item.date_of_birth || '—') + '</td><td><span class="status-badge">' +
            escapeHtml(item.status) + '</span></td><td><a href="/participants/' + encodeURIComponent(item.id) + '">Lihat</a></td></tr>';
        }).join('') + '</tbody></table></div>'
      : '<section class="empty-state"><p>Belum ada Peserta yang sesuai dengan scope atau filter ini.</p><a class="button-link" href="/participants/new">+ Tambah Peserta</a></section>';
    var hasNext = data.page * data.limit < data.total;
    content.innerHTML = '<header class="section-header"><h2>Participants</h2><a class="button-link" href="/participants/new">+ Tambah Peserta</a></header>' +
      filters + body + '<nav class="pagination" aria-label="Pagination Participant"><button id="previous-page" type="button"' +
      (data.page <= 1 ? ' disabled' : '') + '>Sebelumnya</button><span class="caption">Halaman ' + escapeHtml(data.page) +
      ' · Total ' + escapeHtml(data.total) + '</span><button id="next-page" type="button"' + (hasNext ? '' : ' disabled') + '>Berikutnya</button></nav>';
    document.querySelector('#participant-filter select[name="status"]').value = status;
    document.getElementById('participant-filter').addEventListener('submit', function filter(event) {
      event.preventDefault();
      var formData = new FormData(event.currentTarget);
      var next = new URLSearchParams();
      ['search', 'status'].forEach(function set(name) {
        var value = String(formData.get(name) || '').trim();
        if (value) next.set(name, value);
      });
      window.history.replaceState(null, '', '/participants' + (next.toString() ? '?' + next : ''));
      load();
    });
    document.getElementById('previous-page').addEventListener('click', function previous() {
      query.set('page', String(Math.max(1, data.page - 1)));
      window.history.replaceState(null, '', '/participants?' + query.toString());
      load();
    });
    document.getElementById('next-page').addEventListener('click', function next() {
      query.set('page', String(data.page + 1));
      window.history.replaceState(null, '', '/participants?' + query.toString());
      load();
    });
  }

  function participantForm(item) {
    var editing = Boolean(item);
    content.innerHTML = '<h2>' + (editing ? 'Edit Peserta' : 'Tambah Peserta') + '</h2>' +
      '<form id="participant-form" class="form-grid"><fieldset><legend>Profil</legend>' +
      '<label>Nama<input name="name" required maxlength="200" value="' + escapeHtml(item && item.name) + '"></label>' +
      '<label>Tanggal lahir<input name="date_of_birth" type="date" value="' + escapeHtml(item && item.date_of_birth) + '"></label>' +
      '<label>Gender<input name="gender" maxlength="40" value="' + escapeHtml(item && item.gender) + '"></label></fieldset>' +
      '<fieldset><legend>Kontak</legend><label>Telepon<input name="phone" type="tel" maxlength="40" value="' + escapeHtml(item && item.phone) + '"></label>' +
      '<label>Email<input name="email" type="email" maxlength="254" value="' + escapeHtml(item && item.email) + '"></label></fieldset>' +
      '<fieldset><legend>Status</legend><label>Status<select name="status"><option value="active">Active</option><option value="inactive">Inactive</option></select></label></fieldset>' +
      '<div class="form-actions"><a href="/participants">Batal</a><button type="submit">Simpan</button></div></form>';
    var participantFormElement = document.getElementById('participant-form');
    participantFormElement.elements.status.value = (item && item.status) || 'active';
    participantFormElement.addEventListener('submit', function submit(event) {
      event.preventDefault();
      var formData = new FormData(participantFormElement);
      var payload = {
        name: formData.get('name'), phone: formData.get('phone') || null,
        email: formData.get('email') || null, date_of_birth: formData.get('date_of_birth') || null,
        gender: formData.get('gender') || null, status: formData.get('status'),
      };
      request(editing ? participantId : '', {
        method: editing ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      }).then(function saved(savedItem) { window.location.assign('/participants/' + savedItem.id); }).catch(setError);
    });
  }

  function renderDetail(item) {
    content.innerHTML = '<nav aria-label="Breadcrumb"><a href="/participants">Participants</a> / Detail</nav>' +
      '<header class="section-header"><div><h2>' + escapeHtml(item.name) + '</h2><span class="status-badge">' + escapeHtml(item.status) +
      '</span></div><a class="button-link" href="/participants/' + encodeURIComponent(item.id) + '/edit">Edit</a></header>' +
      '<dl><dt>Telepon</dt><dd>' + escapeHtml(item.phone || '—') + '</dd><dt>Email</dt><dd>' + escapeHtml(item.email || '—') +
      '</dd><dt>Tanggal Lahir</dt><dd>' + escapeHtml(item.date_of_birth || '—') + '</dd><dt>Gender</dt><dd>' +
      escapeHtml(item.gender || '—') + '</dd><dt>Unit</dt><dd>' + escapeHtml(item.unit_id) + '</dd></dl>';
  }

  function load() {
    var values = scope();
    if (!values.token || !values.organizationId || !values.unitId) return;
    saveScope(values);
    content.innerHTML = '<p class="state-loading" role="status">Memuat Peserta…</p>';
    if (mode === 'create') { participantForm(null); return; }
    request(mode === 'detail' || mode === 'edit' ? participantId : '')
      .then(function loaded(data) { if (mode === 'list') renderList(data); else if (mode === 'edit') participantForm(data); else renderDetail(data); })
      .catch(setError);
  }

  tokenInput.value = sessionStorage.getItem('qima-participant-token') || sessionStorage.getItem('qima-activity-token') || '';
  organizationInput.value = sessionStorage.getItem('qima-participant-organization') || sessionStorage.getItem('qima-activity-organization') || '';
  unitInput.value = sessionStorage.getItem('qima-participant-unit') || sessionStorage.getItem('qima-activity-unit') || '';
  form.addEventListener('submit', function submitScope(event) { event.preventDefault(); load(); });
  if (tokenInput.value && organizationInput.value && unitInput.value) load();
  else state.className = 'state-loading';
})();
