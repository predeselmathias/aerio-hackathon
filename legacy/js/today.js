/* Aerio — Today: flight planning overview and pre-flight ritual */
(function (App) {
  'use strict';
  const { $, $$, esc, state, DATA, save, toast } = App;

  const ICONS = {
    clock: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg>',
    freestyle: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h9.5a3 3 0 1 0-3-3M3 12.5h13.5a3 3 0 1 1-3 3M3 17h6.5"/></svg>',
    photo: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6.5" width="18" height="13" rx="3"/><circle cx="12" cy="13" r="3.4"/><path d="m8.5 6.5 1.2-2h4.6l1.2 2"/></svg>',
    transit: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8 16.5c3.6-1 4.5-3 5-6.5.4-2.6 1.4-3.6 3-4"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.5 12.5 5 5L19.5 7"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>'
  };

  const firstName = () => ((state.profile && state.profile.name) || 'Pilot').trim().split(/\s+/)[0];

  function greeting() {
    const h = new Date().getHours();
    const first = firstName();
    if (h < 5) return 'Still up, ' + first + '?';
    if (h < 12) return 'Good morning, ' + first;
    if (h < 18) return 'Good afternoon, ' + first;
    return 'Good evening, ' + first;
  }

  function renderWindows() {
    const host = $('#windows');
    if (!host) return;
    host.innerHTML = DATA.WINDOWS.map((w) => {
      return '<div class="window">' +
        '<span class="window-ico">' + ICONS.clock + '</span>' +
        '<div><div class="window-time">' + esc(w.start) + ' — ' + esc(w.end) + '</div>' +
        '<div class="window-meta">Example only · not an availability check</div></div>' +
        '</div>';
    }).join('');
  }

  function renderCopy() {
    const host = $('#aiCopy');
    if (!host) return;
    host.textContent = 'Draw a proposed area on the map to inspect published ROMATSA zones. Candidate times only check requests saved in this browser; verify current restrictions, availability and permissions with the relevant authorities before flying.';
  }

  function renderRecs() {
    const host = $('#recList');
    if (!host) return;
    host.innerHTML = DATA.RECS.map((r) =>
      '<button class="rec" type="button" data-zone="' + esc(r.zone) + '">' +
        '<span class="rec-thumb">' + (ICONS[r.kind] || ICONS.photo) + '</span>' +
        '<span class="rec-body"><strong>' + esc(r.title) + '</strong><span>' + esc(r.sub) + '</span></span>' +
        '<span class="rec-go">' + ICONS.chev + '</span>' +
      '</button>'
    ).join('');
  }

  function renderChecklist() {
    const host = $('#checklist');
    if (!host) return;
    if (!Array.isArray(state.checks) || state.checks.length !== DATA.CHECKLIST.length) {
      state.checks = DATA.CHECKLIST.map((_, i) => !!(state.checks && state.checks[i]));
    }
    host.innerHTML = DATA.CHECKLIST.map((label, i) => {
      const done = !!state.checks[i];
      return '<li><button class="check-item' + (done ? ' is-done' : '') + '" type="button" data-check="' + i + '" aria-pressed="' + done + '">' +
        '<span class="check-box">' + ICONS.check + '</span><span>' + esc(label) + '</span></button></li>';
    }).join('');
    const count = state.checks.filter(Boolean).length;
    const badge = $('#checkCount');
    if (badge) badge.textContent = count + ' / ' + DATA.CHECKLIST.length;
    const bar = $('#checkBar');
    if (bar) bar.style.width = Math.round((count / DATA.CHECKLIST.length) * 100) + '%';
  }

  function nextWindowInfo() {
    const n = App.nowMin();
    const open = DATA.WINDOWS.find((w) => n >= App.toMin(w.start) && n < App.toMin(w.end));
    if (open) return { w: open, phase: 'now', mins: App.toMin(open.end) - n };
    const next = DATA.WINDOWS.find((w) => n < App.toMin(w.start));
    if (next) return { w: next, phase: 'next', mins: App.toMin(next.start) - n };
    return { w: DATA.WINDOWS[0], phase: 'tomorrow', mins: 24 * 60 - n + App.toMin(DATA.WINDOWS[0].start) };
  }

  function renderStats() {
    const info = nextWindowInfo();
    const sw = $('#statWindow');
    if (sw) sw.textContent = info.w.start + ' — ' + info.w.end;
    const sc = $('#statCountdown');
    if (sc) {
      sc.textContent = info.phase === 'now'
        ? 'Example only · not availability'
        : info.phase === 'next'
          ? 'Example begins in ' + App.humanGap(info.mins)
          : 'Example schedule · not availability';
    }

    const sz = $('#statZones');
    if (sz) sz.textContent = DATA.ZONES.length + ' examples';

    const a = state.lastAuth;
    const st = $('#statClearance');
    const sub = $('#statClearanceSub');
    if (st && sub) {
      if (a && a.status === 'prepared') {
        st.textContent = 'Package prepared';
        sub.textContent = 'Not submitted';
      } else if (a && a.status === 'sent') {
        st.textContent = 'Marked as sent';
        sub.textContent = 'Delivery is not verified';
      } else if (a && ['approved', 'conditional', 'review'].includes(a.status)) {
        st.textContent = 'Check permissions';
        sub.textContent = 'This local status is not verified';
      } else {
        st.textContent = 'Not requested';
        sub.textContent = 'Prepare a local request package';
      }
    }

    const pill = $('#airspacePill');
    if (pill) {
      pill.className = 'pill pill-quiet';
      pill.innerHTML = '<span class="dot"></span>Planning only · no clearance';
    }

    const stamp = $('#heroStamp');
    if (stamp) {
      const d = new Date();
      stamp.textContent = 'Updated ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
    }
  }

  function renderSidebar() {
    const nw = $('#sideWeather');
    if (nw) nw.textContent = '21° · 3 m/s';
    const p = state.profile || {};
    const name = p.name || (App.user && App.user.name) || 'Pilot';
    const id = p.operatorId || 'Operator profile';
    const pn = $('#profileName');
    const pi = $('#profileId');
    if (pn) pn.textContent = name;
    if (pi) pi.textContent = id;
    const initials = name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'AI';
    ['profileAvatar', 'profileAvatarBig', 'topbarAvatar'].forEach((key) => {
      const av = document.getElementById(key);
      if (av) av.textContent = initials;
    });
  }

  function renderNudge() {
    const box = $('#profileNudge');
    if (!box) return;
    const check = App.profileCheck();
    if (check.pct >= 100) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    const missing = check.missing.slice(0, 2).map((i) => i.label.toLowerCase());
    const copy = missing.length
      ? 'Still needed: ' + missing.join(', ') + (check.missing.length > 2 ? ' and ' + (check.missing.length - 2) + ' more' : '') + '.'
      : 'Your operator file is ready.';
    const title = $('#nudgeTitle');
    const c = $('#nudgeCopy');
    const pct = $('#nudgePct');
    if (title) title.textContent = check.pct === 0 ? 'Set up your operator file' : 'Finish your operator file';
    if (c) c.textContent = copy;
    if (pct) pct.textContent = check.pct + '%';
  }

  function bind() {
    document.addEventListener('click', (e) => {
      const rec = e.target.closest('.rec');
      if (rec) {
        const id = rec.getAttribute('data-zone');
        App.go('airspace');
        window.dispatchEvent(new CustomEvent('altitude:zone', { detail: { id: id, center: true } }));
        return;
      }
      const chk = e.target.closest('[data-check]');
      if (chk) {
        const i = +chk.getAttribute('data-check');
        state.checks[i] = !state.checks[i];
        state.checksDate = App.todayISO();
        save();
        renderChecklist();
        if (state.checks.every(Boolean)) {
          toast('Ready to fly. Winds are calm and the corridor is open.');
        }
        return;
      }
    });
  }

  function init() {
    const g = $('#greeting');
    if (g) g.textContent = greeting();
    renderWindows();
    renderCopy();
    renderRecs();
    renderChecklist();
    renderStats();
    renderSidebar();
    renderNudge();
    bind();
    setInterval(() => { renderWindows(); renderStats(); }, 30000);
    App.onView('today', () => { renderStats(); renderSidebar(); renderNudge(); });
    App.renderToday = function () {
      const greet = $('#greeting');
      if (greet) greet.textContent = greeting();
      renderStats();
      renderSidebar();
      renderChecklist();
      renderNudge();
    };
  }

  init();
})(window.App);
