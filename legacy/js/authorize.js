/* Aerio — drone selection and profile checks for flight requests */
(function (App) {
  'use strict';
  const { $, esc, state, DATA, save, toast } = App;

  const form = $('#authForm');
  if (!form) return;

  let selected = new Set();

  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>';

  /* ── Form setup ────────────────────────────────────────── */
  function fillZones() {
    const sel = $('#formZone');
    if (!sel) return;
    const groups = [
      { label: 'Example open zones · not official', status: 'open' },
      { label: 'Example advisory zones · not official', status: 'advisory' },
      { label: 'Example restricted zones · not official', status: 'restricted' }
    ];
    sel.innerHTML = groups.map((g) => {
      const opts = DATA.ZONES.filter((z) => z.status === g.status).map((z) => {
        const suffix = z.status === 'restricted' ? ' · clearance' : '';
        return '<option value="' + z.id + '">' + esc(z.name + suffix) + '</option>';
      }).join('');
      return '<optgroup label="' + g.label + '">' + opts + '</optgroup>';
    }).join('');
    const initial = App.getZone(state.zoneId) || DATA.ZONES[0];
    sel.value = initial.id;
    syncZonePill();
  }

  function syncZonePill() {
    const z = App.getZone($('#formZone').value);
    const pill = $('#formZonePill');
    if (!pill || !z) return;
    pill.className = 'pill ' + (z.status === 'restricted' ? 'pill-restricted' : z.status === 'advisory' ? 'pill-advisory' : 'pill-quiet');
    pill.textContent = z.status === 'restricted' ? 'Demo · restricted' : z.status === 'advisory' ? 'Demo · advisory' : 'Demo · class ' + z.cls;
  }

  function nextISO(iso) {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dayFor(startMin) {
    return App.nowMin() < startMin ? App.todayISO() : nextISO(App.todayISO());
  }
  function setDateToday() {
    const d = $('#formDate');
    if (d && !d.value) d.value = dayFor(13 * 60);
  }

  function applyZone(id) {
    const sel = $('#formZone');
    if (!sel) return;
    sel.value = id;
    state.zoneId = id;
    save();
    syncZonePill();
    renderLegal();
  }

  function applySlot(zoneId, from, to, altitude) {
    applyZone(zoneId);
    if (from) {
      $('#formFrom').value = from;
      // A window that has already started today rolls to the same slot tomorrow.
      const dateEl = $('#formDate');
      if (dateEl && dateEl.value === App.todayISO() && App.nowMin() >= App.toMin(from)) {
        dateEl.value = nextISO(dateEl.value);
      }
    }
    if (to) $('#formTo').value = to;
    if (altitude) $('[name="altitude"]').value = altitude;
  }

  /* ── Drone selection ──────────────────────────────────── */
  function selectedDrones() {
    const out = [];
    state.drones.forEach(function (d) {
      if (selected.has(d.id)) out.push(d);
    });
    return out;
  }

  function ensureSelection() {
    const valid = {};
    state.drones.forEach((d) => { valid[d.id] = true; });
    Array.from(selected).forEach((id) => { if (!valid[id]) selected.delete(id); });
    if (!selected.size && state.drones.length) {
      const first = state.drones.filter((d) => App.droneCertStatus(d).held)[0] || state.drones[0];
      selected.add(first.id);
    }
  }

  function certChip(d) {
    const st = App.droneCertStatus(d);
    if (!st.code) return '<span class="cert-chip cert-chip-warn">Specific</span>';
    return st.held
      ? '<span class="cert-chip cert-chip-ok">' + esc(st.label) + ' ✓</span>'
      : '<span class="cert-chip cert-chip-warn">' + esc(st.label) + ' needed</span>';
  }

  function renderPicker() {
    const host = $('#dronePicker');
    if (!host) return;
    ensureSelection();

    if (!state.drones.length) {
      host.innerHTML = '<div class="pick-empty"><span class="pick-empty-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="6" cy="6" r="1.8"/><circle cx="18" cy="6" r="1.8"/><circle cx="6" cy="18" r="1.8"/><circle cx="18" cy="18" r="1.8"/><path d="m7.4 7.4 2.6 2.6M13.9 13.9l2.7 2.7M16.6 7.4l-2.6 2.6M7.4 16.6l2.6-2.6"/><rect x="10" y="10" width="4" height="4" rx="1.2"/></svg></span><div><strong>No drones yet</strong><span>Add a drone with its nickname and take-off weight before requesting a flight.</span></div><button class="btn btn-ghost btn-sm" type="button" data-go="profile">Open profile</button></div>';
      return;
    }

    host.innerHTML = state.drones.map(function (d) {
      const on = selected.has(d.id);
      const st = App.droneCertStatus(d);
      const cls = App.droneClass(d.weight);
      const needs = st.code && !st.held;
      return '<label class="drone-pick' + (on ? ' is-selected' : '') + (needs || !st.code ? ' needs-cert' : '') + '">' +
        '<input type="checkbox" value="' + esc(d.id) + '"' + (on ? ' checked' : '') + ' />' +
        '<span class="pick-box" aria-hidden="true">' + CHECK + '</span>' +
        '<span class="pick-main"><strong>' + esc(App.droneLabel(d)) + '</strong><small>' + esc(d.model || 'Custom drone') + ' · ' + esc(App.weightLabel(d.weight)) + '</small></span>' +
        '<span class="pick-meta"><span class="class-pill class-' + cls.toLowerCase() + '">' + esc(cls) + '</span>' + certChip(d) + '</span>' +
        '</label>';
    }).join('');
    updateWarning();
    renderLegal();
  }

  function renderLegal() {
    if (App.renderFlightLegal) App.renderFlightLegal();
  }

  function collectIssues() {
    const p = state.profile || {};
    const sel = selectedDrones();
    const issues = [];
    if (!state.drones.length) {
      issues.push({ title: 'Add a drone', text: 'There are no aircraft in your profile yet. Add the nickname and take-off weight first.' });
    } else if (!sel.length) {
      issues.push({ title: 'Select a drone', text: 'Tick at least one aircraft for this flight.' });
    }
    sel.forEach(function (d) {
      const st = App.droneCertStatus(d);
      if (!st.code) {
        issues.push({ title: 'Specific category required', text: App.droneLabel(d) + ' is over 25 kg. Verify the applicable category and procedure before operating.' });
      } else if (!st.held) {
        issues.push({ title: st.label + ' certificate to verify', text: App.droneLabel(d) + ' (' + (d.model || 'custom') + ', ' + App.droneClass(d.weight) + ', ' + App.weightLabel(d.weight) + ') has no ' + st.label + ' certificate recorded in this profile.' });
      }
    });
    if (!String(p.operatorId || '').trim()) {
      issues.push({ title: 'Operator ID missing', text: 'Add your operator ID in Profile and check current registration requirements before sending.' });
    }
    if (!String(p.registration || '').trim()) {
      issues.push({ title: 'CAA registration missing', text: 'Add the operator registration number in Profile and check current requirements before sending.' });
    }
    return issues;
  }

  function updateWarning() {
    const host = $('#certWarning');
    if (!host) return;
    const issues = collectIssues();
    const insuranceWarn = !App.insuranceValid();
    if (!issues.length && !insuranceWarn) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }
    host.hidden = false;
    host.innerHTML =
      '<div class="cert-warning-head"><span class="warn-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4 21 20H3L12 4Z"/><path d="M12 10v4M12 17h.01"/></svg></span><div><strong>' + (issues.length ? 'Profile details need review' : 'Insurance needs attention') + '</strong><span>' + (issues.length ? 'Verify these records against the official requirements before sending.' : 'Confirm the policy and applicable insurance rules before flying.') + '</span></div></div>' +
      (issues.length ? '<ul class="warn-list">' + issues.map((i) => '<li><strong>' + esc(i.title) + '</strong> — ' + esc(i.text) + '</li>').join('') + '</ul>' : '') +
      (insuranceWarn ? '<p class="warn-soft">Insurance is missing or expired in this profile. Confirm the rules for this operation and update the record if needed.</p>' : '') +
      '<div class="warn-actions"><button class="btn btn-ghost btn-sm" type="button" data-go="profile">Open profile</button></div>';
  }

  function setIdle() {
    const body = $('#submissionBody');
    if (!body) return;
    body.innerHTML = '<p class="form-foot">Prepare a local request package. This prototype does not submit applications or verify permissions.</p>';
    const pill = $('#submissionPill');
    if (pill) {
      pill.className = 'pill pill-quiet';
      pill.textContent = 'Not prepared';
    }
    const sub = $('#submissionSub');
    if (sub) sub.textContent = 'No request submitted';
  }

  /* ── Dom wiring ────────────────────────────────────────── */
  const picker = $('#dronePicker');
  if (picker) {
    picker.addEventListener('change', function (e) {
      const input = e.target.closest('input[type="checkbox"]');
      if (!input) return;
      if (input.checked) selected.add(input.value);
      else selected.delete(input.value);
      const card = input.closest('.drone-pick');
      if (card) card.classList.toggle('is-selected', input.checked);
      updateWarning();
      renderLegal();
    });
  }

  $('#formZone').addEventListener('change', function () { applyZone(this.value); });
  $('#formAck').addEventListener('change', function () {
    if (this.checked) this.closest('.switch-row').classList.remove('is-invalid');
  });

  window.addEventListener('altitude:authorize-zone', function (e) {
    if (!e.detail || !e.detail.id) return;
    applyZone(e.detail.id);
    setTimeout(function () {
      const formEl = $('#authForm');
      if (formEl) formEl.scrollIntoView({ behavior: App.REDUCE ? 'auto' : 'smooth', block: 'start' });
    }, 60);
  });

  /* ── Init ──────────────────────────────────────────────── */
  fillZones();
  setDateToday();
  renderPicker();
  setIdle();
  const badge = $('#authBadge');
  if (badge) badge.hidden = true;
  App.onView('authorize', function () {
    if (state.zoneId) applyZone(state.zoneId);
    renderPicker();
  });

})(window.App);
