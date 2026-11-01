/* Aerio — local flight-area planning and request packages */
(function (App) {
  'use strict';

  const { $, esc, state, save, toast } = App;
  const form = $('#authForm');
  if (!form) return;

  const areaTitle = $('#requestAreaTitle');
  const areaDetails = $('#requestAreaDetails');
  const areaRules = $('#areaRules');
  const slotsHost = $('#candidateSlots');
  const dateInput = $('#formDate');
  const durationInput = $('#flightDuration');
  const startInput = $('#formFrom');
  const endInput = $('#formTo');
  const purposeInput = form.elements.purpose;
  const packageHost = $('#submissionBody');
  const packageSub = $('#submissionSub');
  const packagePill = $('#submissionPill');
  const sampleArea = [
    [44.4776, 26.0712], [44.4772, 26.0850], [44.4722, 26.0914],
    [44.4650, 26.0900], [44.4604, 26.0836], [44.4598, 26.0732],
    [44.4645, 26.0660], [44.4715, 26.0648]
  ];

  function areaSize(area) {
    if (!Array.isArray(area) || area.length < 3) return 0;
    const lat0 = area.reduce((sum, point) => sum + point[0], 0) / area.length;
    const scaleX = 111320 * Math.cos(lat0 * Math.PI / 180);
    const scaleY = 110540;
    const points = area.map((point) => [point[1] * scaleX, point[0] * scaleY]);
    let twiceArea = 0;
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      twiceArea += current[0] * next[1] - next[0] * current[1];
    }
    return Math.abs(twiceArea / 2);
  }

  function renderArea() {
    const area = state.flightArea;
    const ready = Array.isArray(area) && area.length >= 3;
    if (areaTitle) areaTitle.textContent = ready ? 'Proposed polygon · ' + area.length + ' boundary points' : 'Flight area not selected';
    if (areaDetails) {
      areaDetails.textContent = ready
        ? 'Approx. ' + (areaSize(area) / 10000).toFixed(2) + ' ha · ' + area.map((point) => point[0].toFixed(5) + ', ' + point[1].toFixed(5)).join(' · ')
        : 'Draw at least 3 points on the Romania map and close the polygon.';
    }
    if (ready) renderRules(App.findRomatsaRules ? App.findRomatsaRules(area) : []);
    else if (areaRules) {
      areaRules.hidden = true;
      areaRules.innerHTML = '';
    }
    renderAvailability();
  }

  function renderRules(rules) {
    if (!areaRules) return;
    areaRules.hidden = false;
    const romatsaStatus = App.getRomatsaStatus ? App.getRomatsaStatus() : { loaded: true, error: false };
    if (!romatsaStatus.loaded) {
      areaRules.innerHTML = romatsaStatus.error
        ? '<strong>ROMATSA zones could not be checked.</strong><p>Verify the current official map and each applicable authority directly. This planner cannot identify zone contacts while its local dataset is unavailable.</p>'
        : '<strong>Loading ROMATSA zone data…</strong><p>Zone overlap and contact details will appear when the bundled dataset is ready.</p>';
      return;
    }
    if (!rules.length) {
      areaRules.innerHTML = '<strong>No published ROMATSA UAS restricted polygon intersects this draft.</strong><p>This is not proof that the airspace is available. Check current NOTAMs, AIP, local restrictions and the complete ROMATSA map before flying.</p>';
      return;
    }
    const mapnContact = rules.some((rule) => /aerofoto@mapn\.ro/i.test(rule.contact || ''));
    areaRules.innerHTML =
      '<strong>' + rules.length + ' ROMATSA restriction polygon' + (rules.length === 1 ? '' : 's') + ' intersect this draft</strong>' +
      '<ul>' + rules.map((rule) => '<li><b>' + esc(rule.zone_id || 'UAS restriction') + '</b> · ' +
        esc(rule.lower_lim || 'lower limit not listed') + ' – ' + esc(rule.upper_lim || 'upper limit not listed') +
        '<br><span>' + esc(rule.contact || 'No contact listed') + '</span></li>').join('') + '</ul>' +
      (mapnContact
        ? '<p class="area-rule-warning">This ROMATSA data includes aerofoto@mapn.ro as a contact. The Ministry states that open-category photo/video flights outside restricted UAS zones do not need its photo/video approval; restricted zones listing this contact do. Follow the zone instruction and AEROFOTO process.</p>'
        : '<p class="area-rule-warning">Follow the contact and access instructions published for each zone. Controlled/restricted airspace may require separate CAA/ROMATSA/ATC approvals and a flight plan.</p>') +
      '<p class="form-foot">Dataset valid from 30 Apr 2026; verify current restrictions directly with <a href="https://flightplan.romatsa.ro/init/drones" target="_blank" rel="noopener noreferrer">ROMATSA</a>.</p>';
  }

  function minutes(time) {
    const parts = String(time || '').split(':');
    return Number(parts[0]) * 60 + Number(parts[1]);
  }

  function overlap(a, b) {
    if (!App.areasOverlap) return false;
    return App.areasOverlap(a, b);
  }

  function conflictsFor(area, date, from, to) {
    const start = minutes(from);
    const end = minutes(to);
    return state.flightRequests.filter(function (request) {
      return request.status !== 'declined' &&
        request.date === date &&
        minutes(request.from) < end &&
        minutes(request.to) > start &&
        Array.isArray(request.area) &&
        overlap(area, request.area);
    });
    App.onView('authorize', function () {
      renderArea();
      renderLegal();
      renderAvailability();
      renderPackages();
    });
  }

  function renderAvailability() {
    if (!slotsHost) return;
    const area = state.flightArea;
    const date = dateInput && dateInput.value;
    if (!Array.isArray(area) || area.length < 3 || !date) {
      slotsHost.innerHTML = '<p class="schedule-empty">Choose a flight area and date to calculate candidate times.</p>';
      return;
    }
    if (date < App.todayISO()) {
      slotsHost.innerHTML = '<p class="schedule-empty">Past dates do not have candidate times.</p>';
      return;
    }
    const duration = Number(durationInput.value) || 60;
    const slots = [];
    for (let start = 8 * 60; start + duration <= 20 * 60; start += 30) {
      if (date === App.todayISO() && start <= App.nowMin()) continue;
      const from = String(Math.floor(start / 60)).padStart(2, '0') + ':' + String(start % 60).padStart(2, '0');
      const finish = start + duration;
      const to = String(Math.floor(finish / 60)).padStart(2, '0') + ':' + String(finish % 60).padStart(2, '0');
      const conflicts = conflictsFor(area, date, from, to);
      slots.push({ from: from, to: to, conflicts: conflicts });
    }
    slotsHost.innerHTML = (slots.length ? slots.map(function (slot) {
      const selected = startInput.value === slot.from && endInput.value === slot.to;
      const isConflict = slot.conflicts.length > 0;
      return '<button class="candidate-slot' + (selected ? ' is-selected' : '') + (isConflict ? ' is-conflict' : '') + '" type="button" data-slot-from="' + slot.from + '" data-slot-to="' + slot.to + '"' + (isConflict ? ' disabled' : '') + '>' +
        '<strong>' + slot.from + '–' + slot.to + '</strong><span>' +
        (isConflict ? 'Conflict · ' + slot.conflicts.map((item) => esc(item.id)).join(', ') : 'No conflict in your saved requests') +
        '</span></button>';
    }).join('') : '<p class="schedule-empty">No candidate times remain for this date and duration.</p>') +
      '<p class="schedule-local-warning">Candidate times are checked only against this browser’s saved requests. No live or shared booking feed is connected; confirm availability with each relevant authority.</p>';
  }

  function contactsForRules(rules) {
    const contacts = [];
    rules.forEach(function (rule) {
      const contact = String(rule.contact || '').trim();
      if (!contact) return;
      const emails = contact.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig) || [];
      emails.forEach(function (email) {
        if (!contacts.some((item) => item.email.toLowerCase() === email.toLowerCase())) {
          contacts.push({ email: email, source: rule.zone_id || 'ROMATSA zone' });
        }
      });
    });
    return contacts;
  }

  function requiresMapnApproval(rules, purpose) {
    return /photography|filming|cartography/i.test(purpose || '') &&
      rules.some((rule) => /aerofoto@mapn\.ro/i.test(rule.contact || ''));
  }

  function hasMapnContact(rules) {
    return rules.some((rule) => /aerofoto@mapn\.ro/i.test(rule.contact || ''));
  }

  function businessDaysUntil(date) {
    const target = new Date(date + 'T12:00:00');
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);
    let days = 0;
    while (cursor < target) {
      cursor.setDate(cursor.getDate() + 1);
      const weekday = cursor.getDay();
      if (weekday !== 0 && weekday !== 6) days++;
    }
    return days;
  }

  function documentChecklist(request) {
    const checklist = [
      'Operator certificate/registration and operator ID',
      'Identity document of the applicant',
      'Aircraft registration/identification certificate and visible ID-label details',
      'Selected drone serial number, model, take-off mass and camera/sensor parameters'
    ];
    if (request.mapnRequired) {
      checklist.push('MApN standard application form (use the current form linked by the Ministry)');
      checklist.push('Proof/justification for the operation or beneficiary, especially for Bucharest LRR3');
      checklist.push('ORNISS authorization where classified-information rules require it');
    }
    if (request.drones.some((drone) => Number(drone.weight) > 20000)) {
      checklist.push('Third-party liability insurance evidence for aircraft over 20 kg; verify the applicable legal requirements');
    }
    if (request.drones.some((drone) => !drone.serial || !drone.registration)) {
      checklist.push('Complete missing drone serial/registration details in Profile before sending');
    }
    return checklist;
  }

  function requestDocument(request) {
    const profile = state.profile || {};
    const escHtml = (value) => esc(value || 'Not provided');
    const coords = request.area.map((point) => '[' + point[1].toFixed(6) + ', ' + point[0].toFixed(6) + ']').join(', ');
    const rules = request.rules.length
      ? request.rules.map((rule) => '<li><b>' + escHtml(rule.zone_id) + '</b>: ' + escHtml(rule.lower_lim) + '–' + escHtml(rule.upper_lim) + '; contact: ' + escHtml(rule.contact) + '</li>').join('')
      : request.romatsaDatasetAvailable
        ? '<li>No intersecting ROMATSA UAS restricted polygon identified in the bundled snapshot. This is not a clearance.</li>'
        : '<li>The bundled ROMATSA dataset was unavailable when this request was prepared, so polygon intersections could not be checked. Verify the official map and contacts manually.</li>';
    const aircraft = request.drones.map((drone) => '<li>' + escHtml(App.droneLabel(drone)) + ' — ' + escHtml(drone.model) + ', ' + escHtml(drone.registration) + ', S/N ' + escHtml(drone.serial) + ', ' + escHtml(drone.weight) + ' g, camera/sensor: ' + escHtml(drone.camera) + '</li>').join('');
    const attachments = documentChecklist(request).map((item) => '<li>☐ ' + esc(item) + '</li>').join('');
    return '<!doctype html><html lang="en"><meta charset="utf-8"><title>Flight request ' + esc(request.id) + '</title>' +
      '<style>body{font:15px/1.5 Arial,sans-serif;max-width:900px;margin:40px auto;padding:0 24px;color:#172033}h1{font-size:24px}h2{font-size:17px;margin-top:28px;border-bottom:1px solid #ccd3df;padding-bottom:6px}.notice{padding:14px;background:#fff3d4;border:1px solid #e6c46f}.muted{color:#5d6879;font-size:12px}code{overflow-wrap:anywhere}</style><body>' +
      '<h1>UAS flight request — coordination summary</h1><p><b>Reference:</b> ' + esc(request.id) + '<br><b>Status:</b> Prepared by the operator; not submitted or approved<br><b>Prepared:</b> ' + esc(request.preparedAt) + '</p>' +
      '<div class="notice"><b>Not an official application or flight authorization.</b> This summary was generated by a local prototype. Submit the current forms to the relevant authorities, attach the required evidence, and wait for written permission before flying.</div>' +
      '<h2>Operator</h2><p>Name: ' + escHtml(profile.name) + '<br>Operator ID: ' + escHtml(profile.operatorId) + '<br>Registration: ' + escHtml(profile.registration) + '<br>Email: ' + escHtml(profile.email) + '<br>Phone: ' + escHtml(profile.phone) + '</p>' +
      '<h2>Proposed operation</h2><p>Date: ' + esc(request.date) + '<br>Time: ' + esc(request.from) + '–' + esc(request.to) + ' (local time)<br>Purpose: ' + esc(request.purpose) + '<br>Maximum altitude: ' + esc(request.altitude) + ' m AGL<br>Area size estimate: ' + (areaSize(request.area) / 10000).toFixed(2) + ' ha<br>Operator note: ' + escHtml(request.note || 'None provided') + '</p>' +
      '<h2>Aircraft</h2><ul>' + aircraft + '</ul>' +
      '<h2>Proposed polygon (GeoJSON [longitude, latitude])</h2><p><code>' + esc(coords) + '</code></p>' +
      '<h2>Intersecting ROMATSA UAS zones</h2><ul>' + rules + '</ul>' +
      '<h2>Documents to verify and attach</h2><ul>' + attachments + '</ul>' +
      '<h2>Authority-specific steps</h2><p>' + (!request.romatsaDatasetAvailable
        ? 'The bundled ROMATSA dataset was unavailable, so this tool cannot determine whether the area is restricted or whether MApN approval applies. Verify the current map and requirements directly with ROMATSA and MApN.'
        : request.mapnRequired
          ? 'The intersected ROMATSA zone lists aerofoto@mapn.ro. The MApN page says to use the AEROFOTO portal and to submit the photo/video/cartography application at least 7 working days in advance. Use the current MApN form and instructions; this summary does not replace them.'
          : hasMapnContact(request.rules)
            ? 'An intersected ROMATSA zone lists aerofoto@mapn.ro, but the selected purpose is not identified as photo/video/cartography. Confirm the applicable MApN requirements directly before the operation.'
          : 'For open-category photo/video outside restricted UAS zones, the Ministry states that MApN photo/video approval is not required. Other approvals may still apply to this operation.') +
        ' Follow each intersected ROMATSA zone’s published contact instructions. If operating in controlled airspace, confirm CAA/ROMATSA/ATC requirements, flight-plan steps and any required tower coordination directly.</p>' +
      '<h2>Sources to re-check</h2><ul><li><a href="https://flightplan.romatsa.ro/init/drones">ROMATSA UAS map and zone details</a></li><li><a href="https://aerofoto.mapn.ro/">MApN AEROFOTO application</a></li><li><a href="https://www.defense.ro/aviz-filmare-foto-aerian">MApN photo/video approval instructions</a></li><li><a href="https://www.caa.ro/ro/pages/drone">AACR drone information</a></li><li><a href="https://legislatie.just.ro/Public/DetaliiDocument/245405">HG 859/2021 flight authorization procedure</a></li></ul>' +
      '<p class="muted">Generated locally from the operator profile, drone records and a ROMATSA dataset snapshot (valid from 30 April 2026). Check that the data and laws are current.</p></body></html>';
  }

  function geoJsonDocument(request) {
    const ring = request.area.map((point) => [point[1], point[0]]);
    if (ring.length) ring.push(ring[0]);
    return JSON.stringify({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {
          requestId: request.id,
          status: request.status,
          date: request.date,
          from: request.from,
          to: request.to,
          purpose: request.purpose,
          altitude: request.altitude,
          drones: request.drones.map((drone) => drone.id),
          source: 'Operator-drawn proposed area; not an approved reservation'
        },
        geometry: { type: 'Polygon', coordinates: [ring] }
      }]
    }, null, 2);
  }

  function download(name, content, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function mailto(request) {
    if (!request.contacts.length) return '';
    const recipients = request.contacts.map((contact) => contact.email).join(',');
    const subject = 'UAS flight coordination request · ' + request.id + ' · ' + request.date;
    const body = [
      'Dear authority,',
      '',
      'Please advise on the proposed UAS operation in the attached operator-prepared summary.',
      'Request: ' + request.id,
      'Date/time: ' + request.date + ' · ' + request.from + '–' + request.to,
      'Purpose: ' + request.purpose,
      'Area: ' + request.area.map((point) => point[0].toFixed(5) + ', ' + point[1].toFixed(5)).join(' | '),
      '',
      'I have attached the generated summary and the supporting documents required by your current procedure.',
      'Please confirm the applicable procedure and any additional conditions.',
      '',
      'This draft was prepared by the operator; it is not an official form or flight authorization.'
    ].join('\n');
    return 'mailto:' + encodeURIComponent(recipients) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  }

  function packageCard(request) {
    const status = request.status;
    const heading = status === 'approved' ? 'Approval recorded locally' : status === 'sent' ? 'Waiting for an authority response' : 'Draft package ready';
    const statusLabel = status === 'approved' ? 'Local record' : status === 'sent' ? 'Sent by operator' : 'Not sent';
    const contacts = request.contacts.length
      ? '<ul class="package-contacts">' + request.contacts.map((contact) => '<li><a href="mailto:' + esc(contact.email) + '">' + esc(contact.email) + '</a> · listed for ' + esc(contact.source) + '</li>').join('') + '</ul>'
      : request.romatsaDatasetAvailable
        ? '<p>No email address was listed in the intersecting ROMATSA zone data. Follow the published contact instructions manually.</p>'
        : '<p>Zone contacts could not be identified because the bundled ROMATSA dataset was unavailable. Check the official map directly.</p>';
    const recipient = mailto(request);
    const approvals = status === 'sent'
      ? '<div class="approval-record"><label class="field"><span>Authority response/reference or verified basis</span><input id="approvalRef-' + esc(request.id) + '" placeholder="Authority reference, written response, or not-required basis" /></label><label class="switch-row"><input id="approvalCheck-' + esc(request.id) + '" type="checkbox" /><span class="switch-box" aria-hidden="true"></span><span>I have received every required written approval or verified that none is required. This is my local record only.</span></label><button class="btn btn-primary btn-sm" type="button" data-record-approval="' + esc(request.id) + '">Record permission and reserve locally</button></div>'
      : status === 'approved'
        ? '<p class="form-foot">Reference/basis: ' + esc(request.approvalReference || 'Not recorded') + '. This local reservation is not shared with authorities or other operators.</p>'
        : '<button class="btn btn-quiet btn-sm" type="button" data-mark-sent="' + esc(request.id) + '">I sent the email / portal request</button>';
    return '<article class="request-package"><header><div><h4>' + esc(request.id) + '</h4><p>' + esc(request.date) + ' · ' + esc(request.from) + '–' + esc(request.to) + ' · ' + esc(request.drones.map(App.droneLabel).join(', ')) + '</p></div><span class="pill ' + (status === 'approved' ? 'pill-open' : status === 'sent' ? 'pill-advisory' : 'pill-quiet') + '">' + statusLabel + '</span></header>' +
      '<p><strong>' + heading + '</strong></p><p class="form-foot">Authority contacts suggested by intersecting ROMATSA zone data:</p>' + contacts +
      (request.mapnRequired ? '<p class="mapn-deadline">MApN AEROFOTO applies for this zone. Allow at least 7 working days for photo/video/cartography requests, according to the Ministry instructions. Its current application and process must be followed.</p>' : '') +
      '<div class="package-actions"><button class="btn btn-ghost btn-sm" type="button" data-download-summary="' + esc(request.id) + '">Download filled summary</button><button class="btn btn-ghost btn-sm" type="button" data-download-area="' + esc(request.id) + '">Download area GeoJSON</button>' +
      (recipient && status === 'prepared' ? '<a class="btn btn-primary btn-sm" href="' + esc(recipient) + '" data-open-email="' + esc(request.id) + '">Open email draft</a>' : '') + '</div>' +
      (status === 'prepared' ? '<p class="form-foot">Mail apps cannot attach files automatically. Download both files, add the current official forms and supporting evidence, then send. Preparing or opening this draft does not submit it.</p>' : '') +
      approvals + '</article>';
  }

  function renderPackages() {
    if (!packageHost) return;
    const requests = state.flightRequests.slice().reverse();
    packageHost.innerHTML = requests.length
      ? '<p class="package-warning">No authority is connected to this prototype. "Sent" and "approval" statuses are records you enter; they are not verified responses.</p>' + requests.map(packageCard).join('')
      : '<p class="package-warning">Choose an area and prepare a request to create a filled summary and area file. Nothing is submitted automatically.</p>';
    if (packageSub) packageSub.textContent = requests.length
      ? requests.filter((request) => request.status === 'approved').length + ' local reservation(s) · ' + requests.length + ' saved request(s)'
      : 'No package prepared';
    if (packagePill) {
      packagePill.textContent = requests.some((request) => request.status === 'sent') ? 'Awaiting reply' : requests.length ? 'Local only' : 'Not prepared';
      packagePill.className = 'pill ' + (requests.some((request) => request.status === 'sent') ? 'pill-advisory' : 'pill-quiet');
    }
  }

  function renderLegal() {
    const host = $('#legalChecks');
    if (!host) return;
    const selected = Array.from($('#dronePicker').querySelectorAll('input:checked'))
      .map((input) => App.getDrone(input.value)).filter(Boolean);
    const romatsaAvailable = !App.getRomatsaStatus || App.getRomatsaStatus().loaded;
    const rules = romatsaAvailable && App.findRomatsaRules ? App.findRomatsaRules(state.flightArea) : [];
    const mapnContactListed = hasMapnContact(rules);
    const mapnRequired = requiresMapnApproval(rules, purposeInput.value);
    const controlledContact = rules
      .some((rule) => /twr\.|tower|control tower|romatsa/i.test(rule.contact || ''));
    const uninsuredHeavy = selected.some((drone) => Number(drone.weight) > 20000) && !App.insuranceValid();
    const rows = [
      ['AACR / operator registration', 'Confirm the operator registration and eligibility for this operation. Foreign operators should verify cross-border recognition with AACR before travel.'],
      ['Area and people', 'Open-category rules include VLOS, the applicable height limit and restrictions around uninvolved people/assemblies. The map cannot determine whether a site is densely populated or locally restricted.'],
      ['ROMATSA restrictions', state.flightArea.length >= 3 ? (!App.getRomatsaStatus || !App.getRomatsaStatus().loaded ? 'The local dataset has not loaded; check all current restrictions and contacts directly with ROMATSA.' : (App.findRomatsaRules(state.flightArea).length ? 'Follow every intersecting zone’s exact limits, contact and access instructions.' : 'No restricted polygon intersects the local snapshot; other restrictions and NOTAMs may still apply.')) : 'Select a polygon to inspect published restricted-zone contacts and limits.'],
      ['MApN photo/video approval', !romatsaAvailable ? 'The local ROMATSA dataset is unavailable, so this tool cannot determine whether your area is in a restricted zone. Check the official map and MApN requirements directly.' : mapnRequired ? 'The intersected zone lists aerofoto@mapn.ro; use the official AEROFOTO process and allow the published lead time.' : mapnContactListed ? 'The selected purpose is not photo/video/cartography, but the zone lists a MApN contact. Confirm whether any MApN permission applies.' : 'MApN says open-category photo/video outside restricted UAS zones does not need its photo/video approval. Other permissions may still apply.'],
      ['Third-party insurance', uninsuredHeavy ? 'Selected aircraft exceed 20 kg and no valid policy is recorded. Confirm the applicable insurance rules and coverage before flight.' : 'Check the law and insurer for your aircraft and operation; this tool does not determine insurance eligibility.'],
      ['Aircraft certificates', selected.length ? selected.map((drone) => App.droneLabel(drone) + ': ' + (App.droneCertStatus(drone).held ? 'profile records ' + App.droneCertStatus(drone).label : 'verify required competency/certificate')).join(' · ') : 'Select the aircraft you intend to operate.']
    ];
    host.innerHTML = rows.map((row) => '<li class="' + ((row[0].startsWith('ROMATSA') && state.flightArea.length >= 3 && rules.length) || (row[0].startsWith('MApN') && (mapnRequired || !romatsaAvailable)) || (row[0].startsWith('Third-party') && uninsuredHeavy) ? 'is-warn' : '') + '"><span class="legal-check-ico">i</span><div><strong>' + esc(row[0]) + '</strong><span>' + esc(row[1]) + '</span></div></li>').join('') +
      (controlledContact ? '<li class="is-warn"><span class="legal-check-ico">!</span><div><strong>Controlled-airspace coordination</strong><span>Zone data lists a tower/ROMATSA contact. Check flight-plan and prior-clearance requirements and call the tower when the published instructions require it; do not rely on this planner as a clearance.</span></div></li>' : '');
    const pill = $('#legalPill');
    if (pill) {
      pill.textContent = 'Verify official rules';
      pill.className = 'pill pill-advisory';
    }
  }
  App.renderFlightLegal = renderLegal;

  function selectedDrones() {
    return Array.from($('#dronePicker').querySelectorAll('input:checked'))
      .map((input) => App.getDrone(input.value)).filter(Boolean);
  }

  function prepareRequest(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (state.flightArea.length < 3) {
      toast('Draw and close a flight-area polygon on the map first.', 'info');
      window.dispatchEvent(new CustomEvent('altitude:start-area-draw'));
      return;
    }
    const drones = selectedDrones();
    if (!drones.length) {
      toast('Select at least one drone for this request.', 'info');
      $('#dronePicker').scrollIntoView({ behavior: App.REDUCE ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    const data = new FormData(form);
    const date = String(data.get('date') || '');
    const from = String(data.get('from') || '');
    const to = String(data.get('to') || '');
    const altitude = Number(data.get('altitude'));
    const duration = Number(durationInput.value);
    const startMinute = minutes(from);
    const endMinute = minutes(to);
    if (!date || date < App.todayISO() || !from || !to ||
        ![30, 60, 90].includes(duration) || endMinute - startMinute !== duration ||
        startMinute < 8 * 60 || endMinute > 20 * 60 || startMinute % 30 !== 0) {
      toast('Choose a date and a valid candidate time.', 'info');
      return;
    }
    if (!Number.isFinite(altitude) || altitude < 5 || altitude > 120) {
      toast('Set a proposed altitude between 5 and 120 m AGL, then verify the applicable limit for this area.', 'info');
      return;
    }
    const conflicts = conflictsFor(state.flightArea, date, from, to);
    if (conflicts.length) {
      toast('This time overlaps a locally saved request. Choose another candidate slot.', 'info');
      renderAvailability();
      return;
    }
    if (!$('#formAck').checked) {
      $('#formAck').closest('.switch-row').classList.add('is-invalid');
      $('#formAck').focus();
      toast('Confirm that you have checked the official requirements before preparing a request.', 'info');
      return;
    }

    const rules = App.findRomatsaRules ? App.findRomatsaRules(state.flightArea) : [];
    const contacts = contactsForRules(rules);
    const purpose = String(data.get('purpose') || '');
    const mapnRequired = requiresMapnApproval(rules, purpose);
    const request = {
      id: 'RO-UAS-' + Date.now().toString(36).toUpperCase(),
      status: 'prepared',
      preparedAt: new Date().toISOString(),
      date: date,
      from: from,
      to: to,
      purpose: purpose,
      altitude: String(altitude),
      note: String(data.get('note') || ''),
      area: state.flightArea.map((point) => [Number(point[0]), Number(point[1])]),
      rules: rules,
      contacts: contacts,
      mapnRequired: mapnRequired,
      romatsaDatasetAvailable: !App.getRomatsaStatus || App.getRomatsaStatus().loaded,
      drones: drones.map((drone) => Object.assign({}, drone))
    };
    request.documentHtml = requestDocument(request);
    request.geoJson = geoJsonDocument(request);
    state.flightRequests.push(request);
    state.lastAuth = { status: 'prepared', code: request.id, date: date, from: from, to: to, area: request.area };
    save();
    renderPackages();
    renderArea();
    const lead = mapnRequired ? businessDaysUntil(date) : null;
    toast(mapnRequired && lead < 7
      ? 'Package prepared. MApN instructions say photo/video/cartography requests need at least 7 working days.'
      : 'Request documents prepared. Nothing has been sent to an authority.', 'info');
    $('#submissionCard').scrollIntoView({ behavior: App.REDUCE ? 'auto' : 'smooth', block: 'start' });
  }

  form.addEventListener('submit', prepareRequest, true);

  const chooseArea = $('#chooseFlightArea');
  if (chooseArea) chooseArea.addEventListener('click', function () {
    window.dispatchEvent(new CustomEvent('altitude:start-area-draw'));
  });
  const sampleButton = $('#fillRecommended');
  if (sampleButton) {
    sampleButton.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      state.flightArea = sampleArea.map((point) => point.slice());
      save();
      window.dispatchEvent(new CustomEvent('altitude:area-selected', { detail: { area: state.flightArea } }));
      App.go('authorize');
      toast('Sample area selected for demonstration. It is not a permission to fly.', 'info');
    }, true);
  }

  window.addEventListener('altitude:area-selected', function () {
    renderArea();
    renderLegal();
    App.go('authorize');
  });
  window.addEventListener('altitude:area-cleared', function () {
    renderArea();
    renderLegal();
  });
  window.addEventListener('altitude:authorize-zone', renderLegal);
  window.addEventListener('altitude:romatsa-loaded', renderArea);
  window.addEventListener('altitude:romatsa-error', renderArea);
  window.addEventListener('altitude:flight-requests-updated', function () {
    renderAvailability();
    renderPackages();
  });
  $('#dronePicker').addEventListener('change', renderLegal);
  [dateInput, durationInput, startInput, endInput, purposeInput].forEach(function (input) {
    if (input) input.addEventListener('change', function () {
      renderAvailability();
      renderLegal();
    });
    $('#formZone').addEventListener('change', renderLegal);
  });
  slotsHost.addEventListener('click', function (event) {
    const button = event.target.closest('[data-slot-from]');
    if (!button || button.disabled) return;
    startInput.value = button.getAttribute('data-slot-from');
    endInput.value = button.getAttribute('data-slot-to');
    renderAvailability();
  });

  function findRequest(id) {
    return state.flightRequests.find((request) => request.id === id);
  }

  document.addEventListener('click', function (event) {
    const downloadSummary = event.target.closest('[data-download-summary]');
    if (downloadSummary) {
      const request = findRequest(downloadSummary.getAttribute('data-download-summary'));
      if (request) download(request.id + '-summary.html', request.documentHtml, 'text/html;charset=utf-8');
      return;
    }
    const downloadArea = event.target.closest('[data-download-area]');
    if (downloadArea) {
      const request = findRequest(downloadArea.getAttribute('data-download-area'));
      if (request) download(request.id + '-area.geojson', request.geoJson, 'application/geo+json;charset=utf-8');
      return;
    }
    const mailLink = event.target.closest('[data-open-email]');
    if (mailLink) {
      const request = findRequest(mailLink.getAttribute('data-open-email'));
      if (request) {
        request.emailDraftOpenedAt = new Date().toISOString();
        save();
      }
      return;
    }
    const sentButton = event.target.closest('[data-mark-sent]');
    if (sentButton) {
      const request = findRequest(sentButton.getAttribute('data-mark-sent'));
      if (request && request.status === 'prepared') {
        request.status = 'sent';
        request.operatorMarkedSentAt = new Date().toISOString();
        save();
        renderPackages();
        window.dispatchEvent(new CustomEvent('altitude:flight-requests-updated'));
        toast('Marked as sent by you. No delivery or reply can be verified here.', 'info');
      }
      return;
    }
    const approvalButton = event.target.closest('[data-record-approval]');
    if (approvalButton) {
      const request = findRequest(approvalButton.getAttribute('data-record-approval'));
      const reference = $('#approvalRef-' + approvalButton.getAttribute('data-record-approval'));
      const checkbox = $('#approvalCheck-' + approvalButton.getAttribute('data-record-approval'));
      if (!request || request.status !== 'sent') return;
      if (!checkbox.checked || !reference.value.trim()) {
        toast('Confirm that you have the required written permissions and enter an approval reference or basis.', 'info');
        return;
      }
      request.status = 'approved';
      request.approvalReference = reference.value.trim();
      request.approvalRecordedAt = new Date().toISOString();
      save();
      renderPackages();
      window.dispatchEvent(new CustomEvent('altitude:flight-requests-updated'));
      toast('Local reservation recorded. Keep the written authority approvals with you.', 'info');
    }
  });

  dateInput.min = App.todayISO();
  if (!dateInput.value || dateInput.value < App.todayISO()) dateInput.value = App.todayISO();
  renderArea();
  renderLegal();
  renderPackages();
})(window.App);
