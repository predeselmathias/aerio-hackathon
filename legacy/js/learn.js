/* Aerio — learning path & mock exam */
(function (App) {
  'use strict';
  const { $, $$, esc, state, DATA, save, toast } = App;

  const ICONS = {
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.7-3.8 3.8-6 7.5-6s6.8 2.2 7.5 6"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 19 6v6c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6l7-3Z"/><path d="m9 11.8 2.1 2.2L15.2 10"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.6A2.6 2.6 0 0 1 6.6 3H20v15H6.6A2.6 2.6 0 0 0 4 20.6V5.6Z"/><path d="M8.5 7h7M8.5 10.5h5"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>'
  };

  const done = () => state.learned;
  const isDone = (id) => state.learned.indexOf(id) !== -1;

  function renderProgress() {
    const pct = Math.round((state.learned.length / DATA.MODULES.length) * 100);
    const ring = $('#learnRing');
    if (ring) ring.style.setProperty('--p', pct);
    const v = $('#learnRingValue');
    if (v) v.textContent = pct + '%';
    const sub = $('#learnSub');
    if (sub) {
      sub.textContent = state.learned.length === DATA.MODULES.length
        ? 'All four modules complete. The mock exam is waiting.'
        : state.learned.length + ' of ' + DATA.MODULES.length + ' modules complete · ' + (DATA.MODULES.length - state.learned.length) + ' left.';
    }
    const cont = $('#continueLearning');
    if (cont) cont.textContent = state.learned.length === DATA.MODULES.length ? 'Review the last module' : 'Continue learning';
  }

  function renderModules() {
    const host = $('#moduleGrid');
    if (!host) return;
    host.innerHTML = DATA.MODULES.map(function (m) {
      const finished = isDone(m.id);
      return '<div class="module' + (finished ? ' is-done' : '') + '" data-module="' + m.id + '" role="button" tabindex="0">' +
        '<div class="module-top">' +
        '<span class="module-ico">' + (ICONS[m.icon] || ICONS.book) + '</span>' +
        '<span class="pill ' + (finished ? 'pill-open' : 'pill-quiet') + '">' + (finished ? 'Completed' : esc(m.level)) + '</span>' +
        '</div>' +
        '<div><h3>' + esc(m.title) + '</h3><p>' + esc(m.summary) + '</p></div>' +
        '<div class="module-meta"><span>' + m.minutes + ' min</span><i class="sep"></i><span>' + m.lessons + ' lessons</span>' +
        '<span class="module-cta">' + (finished ? 'Review' : 'Open') + ICONS.chev + '</span></div>' +
        '</div>';
    }).join('');
    renderProgress();
  }

  function completeModule(id) {
    if (!isDone(id)) {
      state.learned.push(id);
      save();
      renderModules();
      const m = DATA.MODULES.filter(function (x) { return x.id === id; })[0];
      toast('“' + m.title + '” marked complete.');
    }
  }

  function openModule(id) {
    const m = DATA.MODULES.filter(function (x) { return x.id === id; })[0];
    if (!m) return;
    const finished = isDone(id);
    App.openSheet({
      kicker: m.level + ' · ' + m.minutes + ' min read',
      title: m.title,
      body: m.body,
      actions: finished
        ? [{ label: 'Close', primary: true, onClick: function () { App.closeSheet(); } }]
        : [
          { label: 'Later', quiet: true, onClick: function () { App.closeSheet(); } },
          { label: 'Mark complete', primary: true, onClick: function () { completeModule(id); App.closeSheet(); } }
        ]
    });
  }

  document.addEventListener('click', function (e) {
    const card = e.target.closest('[data-module]');
    if (card) { openModule(card.getAttribute('data-module')); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest ? e.target.closest('[data-module]') : null;
    if (!card) return;
    e.preventDefault();
    openModule(card.getAttribute('data-module'));
  });

  $('#continueLearning').addEventListener('click', function () {
    const next = DATA.MODULES.filter(function (m) { return !isDone(m.id); })[0];
    if (next) openModule(next.id);
    else {
      $('#examCard').scrollIntoView({ behavior: App.REDUCE ? 'auto' : 'smooth', block: 'center' });
      toast('You have finished the path — try the mock exam.', 'info');
    }
  });

  $('#mockExamJump').addEventListener('click', function () {
    $('#examCard').scrollIntoView({ behavior: App.REDUCE ? 'auto' : 'smooth', block: 'center' });
  });

  /* ── Mock exam ─────────────────────────────────────────── */
  let picks = [null, null, null];
  let checked = false;

  function renderExam() {
    const host = $('#examBody');
    if (!host) return;
    const letters = ['A', 'B', 'C', 'D'];
    host.innerHTML = DATA.EXAM.map(function (q, qi) {
      const options = q.options.map(function (opt, oi) {
        let cls = 'answer';
        if (checked) {
          if (oi === q.answer) cls += ' is-correct';
          else if (picks[qi] === oi) cls += ' is-wrong';
        } else if (picks[qi] === oi) cls += ' is-picked';
        return '<button class="' + cls + '" type="button" data-q="' + qi + '" data-o="' + oi + '">' +
          '<span class="a-dot">' + (checked && oi === q.answer ? '✓' : letters[oi]) + '</span>' +
          '<span>' + esc(opt) + '</span></button>';
      }).join('');
      const why = checked ? '<p class="exam-why">' + esc(q.why) + '</p>' : '';
      return '<div class="exam-q"><h4><span class="q-num">' + (qi + 1) + '.</span>' + esc(q.q) + '</h4>' +
        '<div class="answers">' + options + '</div>' + why + '</div>';
    }).join('') +
      '<div class="exam-foot">' +
      '<button class="btn ' + (checked ? 'btn-ghost' : 'btn-primary') + '" type="button" id="checkExam">' + (checked ? 'Try again' : 'Check answers') + '</button>' +
      '<span class="exam-score" id="examScore">' + (checked ? scoreText() : picks.filter(function (p) { return p != null; }).length + ' of 3 answered') + '</span>' +
      '</div>';

    const pill = $('#examPill');
    if (pill) {
      pill.textContent = checked ? scoreNum() + ' / 3 correct' : picks.every(function (p) { return p != null; }) ? 'Ready to check' : 'Not started';
      pill.className = 'pill ' + (checked ? (scoreNum() === 3 ? 'pill-open' : 'pill-advisory') : 'pill-quiet');
    }

    $('#checkExam').addEventListener('click', function () {
      if (checked) {
        picks = [null, null, null];
        checked = false;
        renderExam();
        toast('Cleared — take another run.', 'info');
        return;
      }
      if (picks.some(function (p) { return p == null; })) { toast('Answer all three first.', 'info'); return; }
      checked = true;
      renderExam();
      const n = scoreNum();
      toast(n === 3 ? 'Three out of three — exam ready.' : n + ' of 3. Read the notes and try again.', n === 3 ? 'ok' : 'info');
    });

    $$('#examBody .answer').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (checked) return;
        picks[+btn.getAttribute('data-q')] = +btn.getAttribute('data-o');
        renderExam();
      });
    });
  }

  function scoreNum() {
    return DATA.EXAM.reduce(function (n, q, i) { return n + (picks[i] === q.answer ? 1 : 0); }, 0);
  }
  function scoreText() {
    const n = scoreNum();
    if (n === 3) return '3 of 3 — pass';
    return n + ' of 3 — review the highlighted answers';
  }

  renderModules();
  renderExam();
  App.onView('learn', renderProgress);
})(window.App);
