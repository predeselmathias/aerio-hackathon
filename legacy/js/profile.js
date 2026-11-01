/* Aerio — profile: operator file, certificates, drones, live-traffic key */
(function (App) {
  'use strict';
  const { $, $$, esc, state, save, toast } = App;

  const FR24_URL = 'https://fr24api.flightradar24.com/api/live/flight-positions/light';
  const FR24_BOUNDS = '44.75,44.25,26.35,25.85';

  const initial = (name) => {
    const parts = String(name || '').trim().split(/\s+/);
    return ((parts[0] || 'A')[0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  };

  function paintIdentity() {
    const p = state.profile || {};
    const name = p.name || 'Pilot';
    const id = p.operatorId || 'Operator profile';
    const av = initial(name);
    ['profileAvatar', 'profileAvatarBig', 'topbarAvatar'].forEach((key) => {
      const el = document.getElementById(key);
      if (el) el.textContent = av;
    });
    const top = document.querySelector('.topbar-avatar');
    if (top) top.textContent = av;
    const nameEl = $('#profileName');
    if (nameEl) nameEl.textContent = name;
    const idEl = $('#profileId');
    if (idEl) idEl.textContent = id;
  }

  function renderHero() {
    const p = state.profile || {};
    const check = App.profileCheck();
    paintIdentity();

    const name = p.name || 'Your operator file';
    const email = p.email || (App.user && App.user.email) || '—';
    $('#profileNameBig').textContent = name;
    $('#profileEmail').textContent = email;

    const tags = [];
    if (p.operatorId) tags.push('<span class="tag tag-mono">' + esc(p.operatorId) + '</span>');
    if (p.registration) tags.push('<span class="tag">' + esc(p.registration) + '</span>');
    tags.push('<span class="tag ' + (App.insuranceValid() ? 'tag-ok' : 'tag-warn') + '">' +
      (App.insuranceValid() ? 'Insurance valid' : 'Insurance missing') + '</span>');
    tags.push('<span class="tag">' + state.drones.length + ' drone' + (state.drones.length === 1 ? '' : 's') + '</span>');
    $('#profileTags').innerHTML = tags.join('');

    const ring = $('#profileRing');
    if (ring) ring.style.setProperty('--p', check.pct);
    const ringV = $('#profileRingValue');
    if (ringV) ringV.textContent = check.pct + '%';

    const pill = $('#operatorPill');
    const ready = !!(p.operatorId && p.registration && App.insuranceValid());
    pill.textContent = ready ? 'Ready' : 'Incomplete';
    pill.className = 'pill ' + (ready ? 'pill-open' : 'pill-advisory');
    if (ready) pill.innerHTML = '<span class="dot"></span>Ready';

    const certPill = $('#certPill');
    const held = [];
    if (state.certs.a1a3 && state.certs.a1a3.have) held.push('A1/A3');
    if (state.certs.a2 && state.certs.a2.have) held.push('A2');
    certPill.textContent = held.length ? held.join(' + ') : 'None';
    certPill.className = 'pill ' + (held.length ? 'pill-open' : 'pill-quiet');
    if (held.length) certPill.innerHTML = '<span class="dot"></span>' + esc(held.join(' + '));
  }

  function hydrateOperator() {
    const form = $('#operatorForm');
    if (!form) return;
    const p = state.profile || {};
    ['name', 'operatorId', 'registration', 'insurance', 'insuranceUntil', 'phone', 'email', 'address'].forEach((k) => {
      if (form.elements[k]) form.elements[k].value = p[k] || '';
    });
  }

  function renderCerts() {
    const host = $('#certList');
    if (!host) return;
    const defs = App.DATA.CERTS;
    host.innerHTML = Object.keys(defs).map(function (key) {
      const def = defs[key];
      const rec = state.certs[key] || { have: false, date: '', ref: '' };
      state.certs[key] = rec;
      return '' +
        '<article class="cert-row' + (rec.have ? ' is-held' : '') + '" data-cert="' + key + '">' +
          '<div class="cert-top">' +
            '<div class="cert-name"><span class="cert-badge">' + esc(def.label) + '</span>' +
              '<div><strong>' + esc(def.label) + ' certificate</strong><p>' + esc(def.note) + '</p></div>' +
            '</div>' +
            '<label class="mini-switch">' +
              '<input type="checkbox" data-cert-have="' + key + '"' + (rec.have ? ' checked' : '') + ' />' +
              '<span class="mini-track" aria-hidden="true"><i></i></span>' +
              '<span class="mini-label">' + (rec.have ? 'Held' : 'Not held') + '</span>' +
            '</label>' +
          '</div>' +
          '<div class="cert-fields">' +
            '<label class="field"><span>Issued</span><input type="date" data-cert-date="' + key + '" value="' + esc(rec.date || '') + '"' + (rec.have ? '' : ' disabled') + ' /></label>' +
            '<label class="field"><span>Reference</span><input data-cert-ref="' + key + '" value="' + esc(rec.ref || '') + '" placeholder="' + (key === 'a2' ? 'A2-RO-00000' : 'A1A3-RO-00000') + '"' + (rec.have ? '' : ' disabled') + ' /></label>' +
          '</div>' +
        '</article>';
    }).join('');
  }

  function certChip(drone) {
    const st = App.droneCertStatus(drone);
    if (!st.code) return '<span class="cert-chip cert-chip-warn">Specific category</span>';
    return st.held
      ? '<span class="cert-chip cert-chip-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 12.5 4.5 4.5L19 7"/></svg>' + esc(st.label) + '</span>'
      : '<span class="cert-chip cert-chip-warn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4 21 20H3L12 4Z"/><path d="M12 10v4M12 17h.01"/></svg>' + esc(st.label) + ' needed</span>';
  }

  function renderDrones() {
    const host = $('#droneList');
    if (!host) return;
    $('#droneSummary').textContent = state.drones.length
      ? state.drones.length + ' aircraft · ' + state.drones.filter((d) => App.droneCertStatus(d).held).length + ' cleared'
      : 'No aircraft yet';

    if (!state.drones.length) {
      host.innerHTML = '' +
        '<div class="drone-empty">' +
          '<span class="drone-empty-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="6" cy="6" r="1.8"/><circle cx="18" cy="6" r="1.8"/><circle cx="6" cy="18" r="1.8"/><circle cx="18" cy="18" r="1.8"/><path d="m7.4 7.4 2.6 2.6M13.9 13.9l2.7 2.7M16.6 7.4l-2.6 2.6M7.4 16.6l2.6-2.6"/><rect x="10" y="10" width="4" height="4" rx="1.2"/></svg></span>' +
          '<div><strong>Add your first drone</strong><p>Nickname, model and take-off weight are enough to start. Weight sets the class and the certificate you need.</p></div>' +
          '<button class="btn btn-primary btn-sm" type="button" data-add-drone>Add drone</button>' +
        '</div>';
      return;
    }

    host.innerHTML = state.drones.map(function (d) {
      const cls = App.droneClass(d.weight);
      const st = App.droneCertStatus(d);
      const needs = st.code && !st.held;
      const over = cls === 'X';
      return '' +
        '<article class="drone-card' + (needs || over ? ' needs-cert' : '') + '" data-drone="' + esc(d.id) + '">' +
          '<header class="drone-card-head">' +
            '<div class="drone-title">' +
              '<span class="drone-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="6" cy="6" r="1.8"/><circle cx="18" cy="6" r="1.8"/><circle cx="6" cy="18" r="1.8"/><circle cx="18" cy="18" r="1.8"/><path d="m7.4 7.4 2.6 2.6M13.9 13.9l2.7 2.7M16.6 7.4l-2.6 2.6M7.4 16.6l2.6-2.6"/><rect x="10" y="10" width="4" height="4" rx="1.2"/></svg></span>' +
              '<div><strong>' + esc(App.droneLabel(d)) + '</strong><p>' + esc(d.model || 'Custom drone') + ' · ' + esc(App.weightLabel(d.weight)) + '</p></div>' +
            '</div>' +
            '<span class="class-pill class-' + cls.toLowerCase() + '">' + esc(cls) + '</span>' +
          '</header>' +
          '<div class="drone-tags">' + certChip(d) +
            (d.registration ? '<span class="tag tag-mono">' + esc(d.registration) + '</span>' : '<span class="tag tag-warn">No registration</span>') +
            (over ? '<span class="tag tag-warn">Over 25 kg — specific category</span>' : '') +
          '</div>' +
          '<dl class="drone-facts">' +
            (d.serial ? '<div><dt>Serial</dt><dd>' + esc(d.serial) + '</dd></div>' : '') +
            (d.remoteId ? '<div><dt>Remote ID</dt><dd>' + esc(d.remoteId) + '</dd></div>' : '') +
            (d.camera ? '<div><dt>Camera</dt><dd>' + esc(d.camera) + '</dd></div>' : '') +
          '</dl>' +
          (needs ? '<p class="drone-warn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4 21 20H3L12 4Z"/><path d="M12 10v4M12 17h.01"/></svg>' + esc(st.label) + ' is required for ' + esc(cls) + '. Select this drone only after adding the certificate.</p>' : '') +
          '<footer class="drone-card-foot">' +
            '<span class="mono-note">' + (d.notes ? esc(d.notes) : 'Open category') + '</span>' +
            '<span class="drone-actions">' +
              '<button class="icon-btn" type="button" data-edit="' + esc(d.id) + '" title="Edit drone" aria-label="Edit ' + esc(App.droneLabel(d)) + '"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/><path d="m14.5 6.5 3 3"/></svg></button>' +
              '<button class="icon-btn danger" type="button" data-del="' + esc(d.id) + '" title="Delete drone" aria-label="Delete ' + esc(App.droneLabel(d)) + '"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9.5 7V4.8h5V7M7 7l.8 13h8.4L17 7"/><path d="M10 11v5M14 11v5"/></svg></button>' +
            '</span>' +
          '</footer>' +
        '</article>';
    }).join('');
  }

  function renderLegal() {
    const host = $('#legalLinks');
    if (!host) return;
    host.innerHTML = App.DATA.LEGAL.map(function (l) {
      return '<li><a href="' + esc(l.url) + '" target="_blank" rel="noopener">' +
        '<span class="legal-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 3.5h9l4 4v13H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5Z"/><path d="M14.5 3.5V8H19M9 12h6M9 15.5h6"/></svg></span>' +
        '<span><strong>' + esc(l.label) + '</strong><small>' + esc(l.note) + '</small></span>' +
        '<svg class="ico arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></svg>' +
        '</a></li>';
    }).join('');
  }

  function renderFr24() {
    const input = $('#fr24Token');
    if (input && document.activeElement !== input) input.value = state.settings.fr24Token || '';
    const pill = $('#fr24Pill');
    if (!pill) return;
    const has = !!(state.settings.fr24Token || '').trim();
    pill.textContent = has ? 'Key saved' : 'Demo feed';
    pill.className = 'pill ' + (has ? 'pill-open' : 'pill-quiet');
    if (has) pill.innerHTML = '<span class="dot"></span>Key saved';
  }

  function renderAccount() {
    const u = App.user || {};
    const email = (state.profile && state.profile.email) || u.email || '—';
    $('#accountEmail').textContent = email;
    $('#accountSince').textContent = u.createdAt ? App.fmtDate(String(u.createdAt).slice(0, 10)) : '—';
  }

  function render() {
    if (!$('#view-profile')) return;
    hydrateOperator();
    renderHero();
    renderCerts();
    renderDrones();
    renderLegal();
    renderFr24();
    renderAccount();
  }

  /* ── Operator form ───────────────────────────────────── */
  const form = $('#operatorForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const p = state.profile;
      ['name', 'operatorId', 'registration', 'insurance', 'insuranceUntil', 'phone', 'email', 'address'].forEach((k) => {
        p[k] = form.elements[k] ? form.elements[k].value.trim() : '';
      });
      if (!p.name) {
        toast('Add your full name.');
        form.elements.name.focus();
        return;
      }
      save();
      render();
      if (App.refreshToday) App.refreshToday();
      toast('Operator details saved.');
    });
  }

  /* ── Certificates ────────────────────────────────────── */
  const certHost = $('#certList');
  if (certHost) {
    certHost.addEventListener('change', function (e) {
      const t = e.target;
      const have = t.getAttribute('data-cert-have');
      if (have) {
        const rec = state.certs[have] || (state.certs[have] = { have: false, date: '', ref: '' });
        rec.have = t.checked;
        if (rec.have && !rec.date) rec.date = App.todayISO();
        save();
        render();
        if (App.refreshToday) App.refreshToday();
        toast(t.checked ? 'Certificate added to your file.' : 'Certificate removed.');
        return;
      }
      const date = t.getAttribute('data-cert-date');
      const ref = t.getAttribute('data-cert-ref');
      if (date) {
        state.certs[date].date = t.value;
        save();
      }
      if (ref) {
        state.certs[ref].ref = t.value.trim();
        save();
      }
    });
  }

  /* ── Drones ──────────────────────────────────────────── */
  function parseWeight(value) {
    const n = parseFloat(String(value || '').replace(',', '.'));
    return isFinite(n) ? Math.round(n) : 0;
  }

  function openDroneSheet(drone) {
    const editing = !!drone;
    const d = drone || { nickname: '', model: '', weight: '', serial: '', registration: '', remoteId: '', camera: '', notes: '' };
    App.openSheet({
      kicker: 'Your fleet',
      title: editing ? 'Edit ' + App.droneLabel(d) : 'Add a drone',
      body: '' +
        '<form id="droneForm" class="drone-form" autocomplete="off" novalidate>' +
          '<div class="form-grid">' +
            '<label class="field"><span>Nickname <em>(required)</em></span><input name="nickname" value="' + esc(d.nickname) + '" placeholder="Bluebird" required /></label>' +
            '<label class="field"><span>Model</span><input name="model" value="' + esc(d.model) + '" placeholder="DJI Air 3S" /></label>' +
            '<label class="field"><span>Take-off weight (g)</span><input type="number" name="weight" value="' + esc(d.weight || '') + '" min="50" max="60000" step="1" placeholder="724" required /></label>' +
            '<div class="field"><span>Class</span><div class="class-preview" id="classPreview">' + (d.weight ? '<strong>' + App.droneClass(d.weight) + '</strong><span>' + App.certRequirement(d.weight).label + ' required</span>' : '<strong>—</strong><span>Enter a weight</span>') + '</div></div>' +
            '<label class="field"><span>Serial number</span><input name="serial" value="' + esc(d.serial) + '" placeholder="1581F5FKD23B00A9X21" /></label>' +
            '<label class="field"><span>Registration</span><input name="registration" value="' + esc(d.registration) + '" placeholder="RO-UAS-0042-2026" /></label>' +
            '<label class="field"><span>Remote ID</span><input name="remoteId" value="' + esc(d.remoteId) + '" placeholder="RID-3S-0042" /></label>' +
            '<label class="field"><span>Camera / payload</span><input name="camera" value="' + esc(d.camera) + '" placeholder="1-inch CMOS · 50 MP" /></label>' +
            '<label class="field field-wide"><span>Notes</span><input name="notes" value="' + esc(d.notes) + '" placeholder="Main photo platform." /></label>' +
          '</div>' +
          '<p class="form-foot">Weight sets the open-category class: C0 &lt; 250 g, C1 250–899 g, C2 900 g–3.9 kg, C3 4–25 kg. Above 25 kg needs the specific category.</p>' +
          '<p class="auth-error" id="droneError" hidden></p>' +
        '</form>',
      actions: [
        { label: 'Cancel', quiet: true, onClick: function () { App.closeSheet(); } },
        {
          label: editing ? 'Save drone' : 'Add drone',
          primary: true,
          onClick: function () {
            const f = $('#droneForm');
            if (!f) return;
            const err = $('#droneError');
            const nickname = f.elements.nickname.value.trim();
            const weight = parseWeight(f.elements.weight.value);
            let message = '';
            if (nickname.length < 2) message = 'Give the drone a nickname.';
            else if (!weight) message = 'Enter the take-off weight in grams.';
            if (message) {
              err.hidden = false;
              err.textContent = message;
              return;
            }
            const record = {
              id: editing ? d.id : App.newId('d'),
              nickname: nickname,
              model: f.elements.model.value.trim() || 'Custom drone',
              weight: weight,
              serial: f.elements.serial.value.trim(),
              registration: f.elements.registration.value.trim(),
              remoteId: f.elements.remoteId.value.trim(),
              camera: f.elements.camera.value.trim(),
              notes: f.elements.notes.value.trim()
            };
            if (editing) {
              const i = state.drones.findIndex((x) => x.id === d.id);
              if (i >= 0) state.drones[i] = record;
            } else {
              state.drones.push(record);
            }
            save();
            App.closeSheet();
            render();
            if (App.refreshToday) App.refreshToday();
            toast(editing ? 'Drone updated.' : record.nickname + ' added to your fleet.');
          }
        }
      ]
    });

    const f = $('#droneForm');
    if (f) {
      f.elements.weight.addEventListener('input', function () {
        const w = parseWeight(f.elements.weight.value);
        const preview = $('#classPreview');
        if (!preview) return;
        if (!w) {
          preview.innerHTML = '<strong>—</strong><span>Enter a weight</span>';
          return;
        }
        const cls = App.droneClass(w);
        const req = App.certRequirement(w);
        preview.innerHTML = '<strong>' + cls + '</strong><span>' + (cls === 'X' ? 'Specific category' : req.label + ' required') + '</span>';
      });
    }
  }

  const droneHost = $('#droneList');
  if (droneHost) {
    droneHost.addEventListener('click', function (e) {
      const add = e.target.closest('[data-add-drone]');
      if (add) {
        openDroneSheet(null);
        return;
      }
      const edit = e.target.closest('[data-edit]');
      if (edit) {
        const d = App.getDrone(edit.getAttribute('data-edit'));
        if (d) openDroneSheet(d);
        return;
      }
      const del = e.target.closest('[data-del]');
      if (del) {
        const id = del.getAttribute('data-del');
        if (del.getAttribute('data-armed') !== '1') {
          $$('[data-del]', droneHost).forEach((b) => b.removeAttribute('data-armed'));
          del.setAttribute('data-armed', '1');
          del.classList.add('is-armed');
          toast('Click delete again to remove this drone.');
          setTimeout(function () {
            if (del.isConnected) {
              del.removeAttribute('data-armed');
              del.classList.remove('is-armed');
            }
          }, 4000);
          return;
        }
        const d = App.getDrone(id);
        state.drones = state.drones.filter((x) => x.id !== id);
        save();
        render();
        if (App.refreshToday) App.refreshToday();
        if (d) toast(App.droneLabel(d) + ' removed.');
      }
    });
  }

  const addBtn = $('#addDrone');
  if (addBtn) addBtn.addEventListener('click', function () { openDroneSheet(null); });

  /* ── Flightradar24 key ───────────────────────────────── */
  const fr24Form = $('#fr24Form');
  if (fr24Form) {
    fr24Form.addEventListener('submit', function (e) {
      e.preventDefault();
      state.settings.fr24Token = fr24Form.elements.token.value.trim();
      save();
      renderFr24();
      window.dispatchEvent(new CustomEvent('altitude:settings'));
      toast(state.settings.fr24Token ? 'Flightradar24 key saved.' : 'Key removed — using the demo feed.');
    });
  }

  const testBtn = $('#testFr24');
  if (testBtn) {
    testBtn.addEventListener('click', async function () {
      const input = $('#fr24Token');
      const token = (input.value || state.settings.fr24Token || '').trim();
      if (!token) {
        toast('Add a Flightradar24 API key first.');
        if (input) input.focus();
        return;
      }
      const old = testBtn.textContent;
      testBtn.disabled = true;
      testBtn.textContent = 'Testing…';
      const pill = $('#fr24Pill');
      pill.textContent = 'Testing…';
      pill.className = 'pill pill-quiet';
      try {
        const url = FR24_URL + '?bounds=' + FR24_BOUNDS;
        const res = await fetch(url, {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Accept-Version': 'v1',
            'Accept': 'application/json'
          }
        });
        if (res.status === 401 || res.status === 403) throw new Error('Key rejected by Flightradar24 (' + res.status + ').');
        if (res.status === 402) throw new Error('This key has no live-positions plan.');
        if (res.status === 429) throw new Error('Rate limit reached — try again in a minute.');
        if (!res.ok) throw new Error('Flightradar24 returned HTTP ' + res.status + '.');
        const json = await res.json();
        const n = (json.data || []).length;
        pill.textContent = 'Connected · ' + n;
        pill.className = 'pill pill-open';
        pill.innerHTML = '<span class="dot"></span>Connected · ' + n;
        toast('Flightradar24 API works — ' + n + ' aircraft near Bucharest.');
      } catch (err) {
        pill.textContent = 'Connection failed';
        pill.className = 'pill pill-advisory';
        toast(err.message || 'Could not reach Flightradar24.');
      } finally {
        testBtn.disabled = false;
        testBtn.textContent = old;
      }
    });
  }

  /* ── Account actions ─────────────────────────────────── */
  const exportBtn = $('#exportProfile');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      const payload = {
        exportedAt: new Date().toISOString(),
        account: App.user ? { name: App.user.name, email: App.user.email, createdAt: App.user.createdAt } : null,
        profile: state.profile,
        certificates: state.certs,
        drones: state.drones,
        authorization: state.lastAuth || null
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'altitude-profile-' + App.todayISO() + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast('Profile exported.');
    });
  }

  function signOut() {
    if (window.Session) window.Session.signOut();
  }
  const signOutBtn = $('#signOut');
  if (signOutBtn) signOutBtn.addEventListener('click', signOut);
  const logoutBtn = $('#logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', signOut);

  App.onView('profile', render);
  render();
})(window.App);
