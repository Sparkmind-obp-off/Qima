(function initActivities() {
  'use strict';

  var root = document.documentElement;
  var mode = root.getAttribute('data-activity-mode') || 'list';
  var activityId = root.getAttribute('data-activity-id') || '';
  var form = document.getElementById('scope-form');
  var state = document.getElementById('activity-state');
  var content = document.getElementById('activity-content');
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
    sessionStorage.setItem('qima-activity-token', values.token);
    sessionStorage.setItem('qima-activity-organization', values.organizationId);
    sessionStorage.setItem('qima-activity-unit', values.unitId);
  }

  function scopedPath(resource, id, extra) {
    var values = scope();
    var query = new URLSearchParams({
      organization_id: values.organizationId,
      unit_id: values.unitId,
    });
    if (extra) {
      Object.keys(extra).forEach(function add(key) {
        if (extra[key]) query.set(key, extra[key]);
      });
    }
    return '/api/v1/' + resource + (id ? '/' + encodeURIComponent(id) : '') + '?' + query.toString();
  }

  function apiPath(id) {
    var pageQuery = new URLSearchParams(window.location.search);
    var extra = {};
    if (!id && mode === 'list') {
      ['page', 'search', 'status', 'program_id'].forEach(function include(name) {
        var value = pageQuery.get(name);
        if (value) extra[name] = value;
      });
    }
    return scopedPath('activities', id, extra);
  }

  function fetchJson(path, options) {
    var values = scope();
    var config = options || {};
    config.headers = Object.assign(
      { accept: 'application/json', authorization: 'Bearer ' + values.token },
      config.headers || {},
    );
    return fetch(path, config).then(function parse(response) {
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

  function request(id, options) {
    return fetchJson(apiPath(id), options);
  }

  function loadPrograms() {
    return fetchJson(scopedPath('programs', '', { limit: '100' })).then(function list(data) {
      return data.items;
    });
  }

  function setError(error) {
    var heading =
      error.status === 401 || error.status === 403
        ? 'Akses tidak diizinkan'
        : error.status === 404
          ? 'Activity atau Program tidak ditemukan'
          : 'Data belum dapat dimuat';
    content.innerHTML =
      '<h2>' + heading + '</h2><p class="state-error" role="alert">' +
      escapeHtml(error.message || 'Data belum dapat dimuat.') + '</p>' +
      '<button id="retry-button" type="button">Coba lagi</button>';
    document.getElementById('retry-button').addEventListener('click', load);
  }

  function localDate(value) {
    return value ? new Date(value).toLocaleString('id-ID') : '—';
  }

  function renderList(data) {
    var query = new URLSearchParams(window.location.search);
    var search = query.get('search') || '';
    var status = query.get('status') || '';
    var programId = query.get('program_id') || '';
    var filters =
      '<form id="activity-filter" class="filter-bar"><label>Cari<input name="search" type="search" maxlength="200" value="' +
      escapeHtml(search) + '" placeholder="Judul, tipe, atau lokasi"></label><label>Program ID<input name="program_id" value="' +
      escapeHtml(programId) + '" placeholder="Opsional"></label><label>Status<select name="status">' +
      '<option value="">Semua status</option><option value="draft">Draft</option>' +
      '<option value="published">Published</option><option value="archived">Archived</option>' +
      '</select></label><button type="submit">Terapkan</button></form>';
    var body = data.items.length
      ? '<div class="table-wrap"><table><thead><tr><th>Activity</th><th>Program</th><th>Tanggal</th><th>Lokasi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
        data.items.map(function row(item) {
          return '<tr><td>' + escapeHtml(item.title) + '<br><span class="caption">' + escapeHtml(item.activity_type) +
            '</span></td><td>' + escapeHtml(item.program_id || 'Unit langsung') + '</td><td>' + escapeHtml(localDate(item.start_at)) +
            '</td><td>' + escapeHtml(item.location || '—') + '</td><td><span class="status-badge">' + escapeHtml(item.status) +
            '</span></td><td><a href="/activities/' + encodeURIComponent(item.id) + '">Lihat</a></td></tr>';
        }).join('') + '</tbody></table></div>'
      : '<section class="empty-state"><p>Belum ada Activity yang sesuai dengan scope atau filter ini.</p><a class="button-link" href="/activities/new">+ Tambah Activity</a></section>';
    var previousPage = Math.max(1, data.page - 1);
    var hasNext = data.page * data.limit < data.total;
    content.innerHTML =
      '<header class="section-header"><h2>Activities</h2><a class="button-link" href="/activities/new">+ Tambah Activity</a></header>' +
      filters + body + '<nav class="pagination" aria-label="Pagination Activity">' +
      '<button id="previous-page" type="button"' + (data.page <= 1 ? ' disabled' : '') + '>Sebelumnya</button>' +
      '<span class="caption">Halaman ' + escapeHtml(data.page) + ' · Total ' + escapeHtml(data.total) + '</span>' +
      '<button id="next-page" type="button"' + (hasNext ? '' : ' disabled') + '>Berikutnya</button></nav>';
    document.querySelector('#activity-filter select[name="status"]').value = status;
    document.getElementById('activity-filter').addEventListener('submit', function filter(event) {
      event.preventDefault();
      var formData = new FormData(event.currentTarget);
      var next = new URLSearchParams();
      ['search', 'status', 'program_id'].forEach(function set(name) {
        var value = String(formData.get(name) || '').trim();
        if (value) next.set(name, value);
      });
      window.history.replaceState(null, '', '/activities' + (next.toString() ? '?' + next : ''));
      load();
    });
    document.getElementById('previous-page').addEventListener('click', function previous() {
      query.set('page', String(previousPage));
      window.history.replaceState(null, '', '/activities?' + query.toString());
      load();
    });
    document.getElementById('next-page').addEventListener('click', function next() {
      query.set('page', String(data.page + 1));
      window.history.replaceState(null, '', '/activities?' + query.toString());
      load();
    });
  }

  function timestampInput(value) {
    return value ? value.replace(/Z$/, '') : '';
  }

  function utcTimestamp(value) {
    if (!value) return null;
    return new Date(value + 'Z').toISOString().replace('.000Z', 'Z');
  }

  function activityForm(item, programs) {
    var editing = Boolean(item);
    var programOptions = '<option value="">Langsung di bawah Unit</option>' + programs.map(function option(program) {
      return '<option value="' + escapeHtml(program.id) + '">' + escapeHtml(program.name) + '</option>';
    }).join('');
    content.innerHTML =
      '<h2>' + (editing ? 'Edit Activity' : 'Tambah Activity') + '</h2>' +
      '<form id="activity-form" class="form-grid">' +
      '<fieldset><legend>Informasi Dasar</legend><label>Judul Activity<input name="title" required maxlength="200" value="' + escapeHtml(item && item.title) + '"></label>' +
      '<label>Tipe Activity<input name="activity_type" required maxlength="80" value="' + escapeHtml(item && item.activity_type) + '"></label>' +
      '<label>Deskripsi<textarea name="description" maxlength="2000">' + escapeHtml(item && item.description) + '</textarea></label></fieldset>' +
      '<fieldset><legend>Program dan Jadwal</legend><label>Program<select name="program_id">' + programOptions + '</select></label>' +
      '<label>Mulai<input name="start_at" type="datetime-local" step="1" required value="' + escapeHtml(timestampInput(item && item.start_at)) + '"></label>' +
      '<label>Selesai<input name="end_at" type="datetime-local" step="1" value="' + escapeHtml(timestampInput(item && item.end_at)) + '"></label></fieldset>' +
      '<fieldset><legend>Lokasi dan Status</legend><label>Lokasi<input name="location" maxlength="300" value="' + escapeHtml(item && item.location) + '"></label>' +
      '<label>Status<select name="status"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label></fieldset>' +
      '<div class="form-actions"><a href="/activities">Batal</a><span><button name="intent" value="draft" type="submit">Simpan Draft</button> ' +
      '<button name="intent" value="save" type="submit">Simpan</button></span></div></form>';
    var activityFormElement = document.getElementById('activity-form');
    activityFormElement.elements.status.value = (item && item.status) || 'draft';
    activityFormElement.elements.program_id.value = (item && item.program_id) || '';
    activityFormElement.addEventListener('submit', function submit(event) {
      event.preventDefault();
      var formData = new FormData(activityFormElement);
      var intent = event.submitter && event.submitter.value;
      var payload = {
        program_id: formData.get('program_id') || null,
        title: formData.get('title'),
        description: formData.get('description') || null,
        activity_type: formData.get('activity_type'),
        start_at: utcTimestamp(formData.get('start_at')),
        end_at: utcTimestamp(formData.get('end_at')),
        location: formData.get('location') || null,
        status: intent === 'draft' ? 'draft' : formData.get('status'),
      };
      request(editing ? activityId : '', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(function saved(savedItem) {
        window.location.assign('/activities/' + savedItem.id);
      }).catch(setError);
    });
  }

  function renderDetail(item) {
    content.innerHTML =
      '<nav aria-label="Breadcrumb"><a href="/activities">Activities</a> / Detail</nav>' +
      '<header class="section-header"><div><h2>' + escapeHtml(item.title) + '</h2><span class="status-badge">' + escapeHtml(item.status) + '</span></div>' +
      '<div><a class="button-link" href="/activities/' + encodeURIComponent(item.id) + '/edit">Edit</a> <button id="delete-activity" class="danger" type="button">Hapus</button></div></header>' +
      '<dl><dt>Tipe</dt><dd>' + escapeHtml(item.activity_type) + '</dd><dt>Deskripsi</dt><dd>' + escapeHtml(item.description || '—') +
      '</dd><dt>Program</dt><dd>' + escapeHtml(item.program_id || 'Langsung di bawah Unit') + '</dd><dt>Jadwal</dt><dd>' +
      escapeHtml(localDate(item.start_at) + ' – ' + localDate(item.end_at)) + '</dd><dt>Lokasi</dt><dd>' + escapeHtml(item.location || '—') +
      '</dd><dt>Unit</dt><dd>' + escapeHtml(item.unit_id) + '</dd></dl>';
    document.getElementById('delete-activity').addEventListener('click', function remove() {
      if (!window.confirm('Hapus Activity? Activity ini tidak lagi muncul dalam daftar aktif.')) return;
      request(activityId, { method: 'DELETE' })
        .then(function done() { window.location.assign('/activities'); })
        .catch(setError);
    });
  }

  function load() {
    var values = scope();
    if (!values.token || !values.organizationId || !values.unitId) return;
    saveScope(values);
    content.innerHTML = '<p class="state-loading" role="status">Memuat Activity…</p>';
    if (mode === 'create') {
      loadPrograms().then(function programs(items) { activityForm(null, items); }).catch(setError);
      return;
    }
    request(mode === 'detail' || mode === 'edit' ? activityId : '')
      .then(function loaded(data) {
        if (mode === 'list') renderList(data);
        else if (mode === 'edit') {
          loadPrograms().then(function programs(items) { activityForm(data, items); }).catch(setError);
        } else renderDetail(data);
      })
      .catch(setError);
  }

  tokenInput.value = sessionStorage.getItem('qima-activity-token') || sessionStorage.getItem('qima-program-token') || '';
  organizationInput.value = sessionStorage.getItem('qima-activity-organization') || sessionStorage.getItem('qima-program-organization') || '';
  unitInput.value = sessionStorage.getItem('qima-activity-unit') || sessionStorage.getItem('qima-program-unit') || '';
  form.addEventListener('submit', function submitScope(event) {
    event.preventDefault();
    load();
  });
  if (tokenInput.value && organizationInput.value && unitInput.value) load();
  else state.className = 'state-loading';
})();
