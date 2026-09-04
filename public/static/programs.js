(function initPrograms() {
  'use strict';

  var root = document.documentElement;
  var mode = root.getAttribute('data-program-mode') || 'list';
  var programId = root.getAttribute('data-program-id') || '';
  var form = document.getElementById('scope-form');
  var state = document.getElementById('program-state');
  var content = document.getElementById('program-content');
  var tokenInput = document.getElementById('access-token');
  var organizationInput = document.getElementById('organization-id');
  var unitInput = document.getElementById('unit-id');

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function scope() {
    return {
      token: tokenInput.value.trim(),
      organizationId: organizationInput.value.trim(),
      unitId: unitInput.value.trim(),
    };
  }

  function saveScope(values) {
    sessionStorage.setItem('qima-program-token', values.token);
    sessionStorage.setItem('qima-program-organization', values.organizationId);
    sessionStorage.setItem('qima-program-unit', values.unitId);
  }

  function apiPath(id) {
    var values = scope();
    var suffix = id ? '/' + encodeURIComponent(id) : '';
    var query = new URLSearchParams({
      organization_id: values.organizationId,
      unit_id: values.unitId,
    });
    if (!id && mode === 'list') {
      var pageQuery = new URLSearchParams(window.location.search);
      ['page', 'search', 'status'].forEach(function include(name) {
        var value = pageQuery.get(name);
        if (value) query.set(name, value);
      });
    }
    return '/api/v1/programs' + suffix + '?' + query.toString();
  }

  function request(id, options) {
    var values = scope();
    var config = options || {};
    config.headers = Object.assign(
      { accept: 'application/json', authorization: 'Bearer ' + values.token },
      config.headers || {},
    );
    return fetch(apiPath(id), config).then(function parse(response) {
      return response.json().then(function body(payload) {
        if (!response.ok || !payload.ok) {
          var error = new Error(payload && payload.error ? payload.error.message : 'Permintaan gagal.');
          error.status = response.status;
          error.code = payload && payload.error ? payload.error.code : 'UNKNOWN';
          throw error;
        }
        return payload.data;
      });
    });
  }

  function setError(error) {
    var heading =
      error.status === 401 || error.status === 403
        ? 'Akses tidak diizinkan'
        : error.status === 404
          ? 'Program tidak ditemukan'
          : 'Data belum dapat dimuat';
    content.innerHTML =
      '<h2>' + heading + '</h2><p class="state-error" role="alert">' +
      escapeHtml(error.message || 'Data belum dapat dimuat.') + '</p>' +
      '<button id="retry-button" type="button">Coba lagi</button>';
    document.getElementById('retry-button').addEventListener('click', load);
  }

  function renderList(data) {
    var query = new URLSearchParams(window.location.search);
    var search = query.get('search') || '';
    var status = query.get('status') || '';
    var filters =
      '<form id="program-filter" class="filter-bar"><label>Cari<input name="search" type="search" maxlength="160" value="' +
      escapeHtml(search) + '" placeholder="Nama atau slug"></label><label>Status<select name="status">' +
      '<option value="">Semua status</option><option value="draft">Draft</option>' +
      '<option value="published">Published</option><option value="archived">Archived</option>' +
      '</select></label><button type="submit">Terapkan</button></form>';
    var body = data.items.length
      ? '<div class="table-wrap"><table><thead><tr><th>Nama</th><th>Status</th><th>Periode</th><th>Kapasitas</th><th>Aksi</th></tr></thead><tbody>' +
        data.items
          .map(function row(item) {
            return '<tr><td>' + escapeHtml(item.name) + '</td><td><span class="status-badge">' + escapeHtml(item.status) +
              '</span></td><td>' + escapeHtml((item.start_date || '—') + ' – ' + (item.end_date || '—')) +
              '</td><td>' + escapeHtml(item.capacity == null ? '—' : item.capacity) +
              '</td><td><a href="/programs/' + encodeURIComponent(item.id) + '">Lihat</a></td></tr>';
          })
          .join('') +
        '</tbody></table></div>'
      : '<section class="empty-state"><p>Tidak ada program yang sesuai dengan scope atau filter ini.</p></section>';
    var previousPage = Math.max(1, data.page - 1);
    var hasNext = data.page * data.limit < data.total;
    content.innerHTML =
      '<header class="section-header"><h2>Programs</h2><a class="button-link" href="/programs/new">+ Tambah Program</a></header>' +
      filters + body + '<nav class="pagination" aria-label="Pagination program">' +
      '<button id="previous-page" type="button"' + (data.page <= 1 ? ' disabled' : '') + '>Sebelumnya</button>' +
      '<span class="caption">Halaman ' + escapeHtml(data.page) + ' · Total ' + escapeHtml(data.total) + '</span>' +
      '<button id="next-page" type="button"' + (hasNext ? '' : ' disabled') + '>Berikutnya</button></nav>';
    document.querySelector('#program-filter select[name="status"]').value = status;
    document.getElementById('program-filter').addEventListener('submit', function filter(event) {
      event.preventDefault();
      var formData = new FormData(event.currentTarget);
      var next = new URLSearchParams();
      var nextSearch = String(formData.get('search') || '').trim();
      var nextStatus = String(formData.get('status') || '');
      if (nextSearch) next.set('search', nextSearch);
      if (nextStatus) next.set('status', nextStatus);
      window.history.replaceState(null, '', '/programs' + (next.toString() ? '?' + next : ''));
      load();
    });
    document.getElementById('previous-page').addEventListener('click', function previous() {
      query.set('page', String(previousPage));
      window.history.replaceState(null, '', '/programs?' + query.toString());
      load();
    });
    document.getElementById('next-page').addEventListener('click', function next() {
      query.set('page', String(data.page + 1));
      window.history.replaceState(null, '', '/programs?' + query.toString());
      load();
    });
  }

  function programForm(item) {
    var editing = Boolean(item);
    content.innerHTML =
      '<h2>' + (editing ? 'Edit Program' : 'Tambah Program') + '</h2>' +
      '<form id="program-form" class="form-grid">' +
      '<fieldset><legend>Informasi Dasar</legend><label>Nama Program<input name="name" required maxlength="160" value="' + escapeHtml(item && item.name) + '"></label>' +
      '<label>Slug<input name="slug" required maxlength="64" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value="' + escapeHtml(item && item.slug) + '"></label>' +
      '<label>Deskripsi<textarea name="description" maxlength="2000">' + escapeHtml(item && item.description) + '</textarea></label></fieldset>' +
      '<fieldset><legend>Periode</legend><label>Tanggal Mulai<input name="start_date" type="date" value="' + escapeHtml(item && item.start_date) + '"></label>' +
      '<label>Tanggal Selesai<input name="end_date" type="date" value="' + escapeHtml(item && item.end_date) + '"></label></fieldset>' +
      '<fieldset><legend>Kapasitas dan Status</legend><label>Kapasitas<input name="capacity" type="number" min="1" value="' + escapeHtml(item && item.capacity) + '"></label>' +
      '<label>Status<select name="status"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label></fieldset>' +
      '<div class="form-actions"><a href="/programs">Batal</a><span><button name="intent" value="draft" type="submit">Simpan Draft</button> ' +
      '<button name="intent" value="save" type="submit">Simpan</button></span></div></form>';
    var programFormElement = document.getElementById('program-form');
    programFormElement.elements.status.value = (item && item.status) || 'draft';
    programFormElement.addEventListener('submit', function submit(event) {
      event.preventDefault();
      var formData = new FormData(programFormElement);
      var capacity = formData.get('capacity');
      var intent = event.submitter && event.submitter.value;
      var payload = {
        name: formData.get('name'),
        slug: formData.get('slug'),
        description: formData.get('description') || null,
        status: intent === 'draft' ? 'draft' : formData.get('status'),
        start_date: formData.get('start_date') || null,
        end_date: formData.get('end_date') || null,
        capacity: capacity ? Number(capacity) : null,
      };
      request(editing ? programId : '', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function saved(savedItem) {
          window.location.assign('/programs/' + savedItem.id);
        })
        .catch(setError);
    });
  }

  function renderDetail(item) {
    content.innerHTML =
      '<nav aria-label="Breadcrumb"><a href="/programs">Programs</a> / Detail</nav>' +
      '<header class="section-header"><div><h2>' + escapeHtml(item.name) + '</h2><span class="status-badge">' + escapeHtml(item.status) + '</span></div>' +
      '<div><a class="button-link" href="/programs/' + encodeURIComponent(item.id) + '/edit">Edit</a> <button id="delete-program" class="danger" type="button">Hapus</button></div></header>' +
      '<dl><dt>Deskripsi</dt><dd>' + escapeHtml(item.description || '—') + '</dd><dt>Periode</dt><dd>' + escapeHtml((item.start_date || '—') + ' – ' + (item.end_date || '—')) +
      '</dd><dt>Kapasitas</dt><dd>' + escapeHtml(item.capacity == null ? '—' : item.capacity) + '</dd><dt>Unit</dt><dd>' + escapeHtml(item.unit_id) + '</dd></dl>';
    document.getElementById('delete-program').addEventListener('click', function remove() {
      if (!window.confirm('Hapus Program? Program ini tidak lagi muncul dalam daftar aktif.')) return;
      request(programId, { method: 'DELETE' })
        .then(function done() { window.location.assign('/programs'); })
        .catch(setError);
    });
  }

  function load() {
    var values = scope();
    if (!values.token || !values.organizationId || !values.unitId) return;
    saveScope(values);
    content.innerHTML = '<p class="state-loading" role="status">Memuat program…</p>';
    if (mode === 'create') {
      programForm(null);
      return;
    }
    request(mode === 'detail' || mode === 'edit' ? programId : '')
      .then(function loaded(data) {
        if (mode === 'list') renderList(data);
        else if (mode === 'edit') programForm(data);
        else renderDetail(data);
      })
      .catch(setError);
  }

  tokenInput.value = sessionStorage.getItem('qima-program-token') || '';
  organizationInput.value = sessionStorage.getItem('qima-program-organization') || '';
  unitInput.value = sessionStorage.getItem('qima-program-unit') || '';
  form.addEventListener('submit', function submitScope(event) {
    event.preventDefault();
    load();
  });
  if (tokenInput.value && organizationInput.value && unitInput.value) load();
  else state.className = 'state-loading';
})();
