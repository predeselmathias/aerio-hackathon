/* Aerio — Romania map: ROMATSA UAS data + OSM/Esri + Flightradar24 */
(function (App) {
  'use strict';
  const { $, $$, esc, state, DATA, save, toast } = App;

  const frame = $('#mapFrame');
  const mapEl = $('#map');
  if (!frame || !mapEl) return;
  if (!window.L) {
    mapEl.innerHTML = '<div class="map-fallback"><strong>Map library unavailable</strong><span>Leaflet could not be loaded from the local vendor folder.</span></div>';
    return;
  }

  const STATUS = {
    open: { label: 'Demo open', pill: 'pill-open', row: 'Example only' },
    advisory: { label: 'Demo advisory', pill: 'pill-advisory', row: 'Example only' },
    restricted: { label: 'Demo restricted', pill: 'pill-restricted', row: 'Example only' }
  };
  const COLORS = { open: '#30D158', advisory: '#FF9F0A', restricted: '#FF453A' };
  const FR24_URL = 'https://fr24api.flightradar24.com/api/live/flight-positions/light';
  const DEMO_NAMES = [
    ['WZZ1WK', 'Wizz Air', 'A21N', 'HA-LDV', 'OTP', 'LTN'],
    ['ROT381', 'TAROM', 'B738', 'YR-BGK', 'OTP', 'FCO'],
    ['RYR8YP', 'Ryanair', 'B738', '9H-QAA', 'OTP', 'STN'],
    ['DLH1AP', 'Lufthansa', 'A320', 'D-AIUL', 'FRA', 'OTP'],
    ['AFR1463', 'Air France', 'A320', 'F-HBNK', 'CDG', 'OTP'],
    ['TAR7LM', 'TAROM', 'AT76', 'YR-ATF', 'OTP', 'IAS'],
    ['WZZ9QP', 'Wizz Air', 'A320', 'HA-LWA', 'OTP', 'BGY'],
    ['BAW884', 'British Airways', 'A320', 'G-EUYF', 'LHR', 'OTP'],
    ['LOT3W', 'LOT', 'E195', 'SP-LMB', 'WAW', 'OTP'],
    ['THY5B', 'Turkish Airlines', 'A321', 'TC-JSL', 'IST', 'OTP']
  ];
  const NOTAMS = [
    { lat: 44.548, lon: 26.135, title: 'Parachute activity', detail: 'SFC – 2 500 ft · 13:00–17:00' },
    { lat: 44.402, lon: 26.152, title: 'Crane at 180 m', detail: 'Sector 3 · until Friday' },
    { lat: 44.510, lon: 26.012, title: 'Temporary UAS area', detail: 'SFC – 400 ft · sunrise–sunset' }
  ];

  /* ── Map ──────────────────────────────────────────────── */
  const map = L.map(mapEl, {
    zoomControl: false,
    attributionControl: true,
    minZoom: 5,
    maxZoom: 18,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    maxBounds: [[43.35, 19.65], [48.55, 30.15]],
    maxBoundsViscosity: 0.75,
    preferCanvas: false
  }).setView([45.85, 24.95], 6.25);
  map.attributionControl.setPrefix(false);

  const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    subdomains: 'abc',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
  });
  const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics'
  });

  streets.addTo(map);
  const aerialOpacityControl = $('#aerialOpacityControl');
  const aerialOpacity = $('#aerialOpacity');
  const savedOpacity = Number(state.settings.aerialOpacity);
  if (aerialOpacity && isFinite(savedOpacity)) aerialOpacity.value = String(Math.max(0, Math.min(100, savedOpacity)));
  let aerialOn = false;
  const romatsaGroup = L.geoJSON(null, {
    style: function () {
      return {
        color: '#7655d9',
        weight: 1.5,
        opacity: 0.95,
        fillColor: '#8b6cf0',
        fillOpacity: 0.18
      };
    },
    onEachFeature: function (feature, layer) {
      const props = feature.properties || {};
      const name = props.zone_id || 'ROMATSA UAS zone';
      const details = [
        props.lower_lim ? 'Lower limit: ' + props.lower_lim : '',
        props.upper_lim ? 'Upper limit: ' + props.upper_lim : '',
        props.contact ? 'Contact: ' + props.contact : ''
      ].filter(Boolean).map(esc);
      layer.bindTooltip(esc(name), { sticky: true, className: 'romatsa-tip' });
      layer.bindPopup(
        '<strong>' + esc(name) + '</strong>' +
        (details.length ? '<br>' + details.join('<br>') : '') +
        '<br><small>ROMATSA published UAS restriction data. Verify current official information before flight.</small>'
      );
    }
  }).addTo(map);
  let romatsaOn = true;
  let romatsaLoaded = false;
  let romatsaError = false;
  let romatsaFeatures = [];
  const ROMATSA_GEOJSON_URL = 'data/romatsa-uav-zones.json';

  function updateRomatsaStatus() {
    const status = $('#romatsaStatus');
    if (!status) return;
    const romanian = document.documentElement.lang === 'ro-RO';
    if (romatsaError) {
      status.textContent = romanian
        ? 'Zonele ROMATSA nu s-au încărcat. Verifică restricțiile curente pe site-ul oficial ROMATSA.'
        : 'ROMATSA zones could not be loaded. Open the official ROMATSA source to verify current restrictions.';
      return;
    }
    if (!romatsaLoaded) {
      status.textContent = romanian ? 'Se încarcă zonele UAS ROMATSA…' : 'Loading current ROMATSA UAS zones…';
      return;
    }
    status.innerHTML = romanian
      ? 'Zone UAS restricționate ROMATSA (valabile din 30 apr. 2026) · <a href="https://flightplan.romatsa.ro/init/drones" target="_blank" rel="noopener noreferrer">sursă oficială</a> · nu reprezintă o autorizare completă de zbor.'
      : 'ROMATSA restricted UAS zones (valid from 30 Apr 2026) · <a href="https://flightplan.romatsa.ro/init/drones" target="_blank" rel="noopener noreferrer">official source</a> · not a complete airspace clearance.';
  }

  async function loadRomatsaZones() {
    updateRomatsaStatus();
    try {
      const response = await fetch(ROMATSA_GEOJSON_URL, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
        throw new Error('Unexpected GeoJSON format');
      }
      romatsaGroup.addData(data);
      romatsaFeatures = data.features;
      romatsaLoaded = true;
      window.dispatchEvent(new CustomEvent('altitude:romatsa-loaded'));
      const status = $('#romatsaStatus');
      if (status) status.classList.remove('is-error');
      updateRomatsaStatus();
    } catch (error) {
      romatsaError = true;
      window.dispatchEvent(new CustomEvent('altitude:romatsa-error'));
      const status = $('#romatsaStatus');
      if (status) status.classList.add('is-error');
      updateRomatsaStatus();
      console.error('Unable to load ROMATSA UAS zones:', error);
    }
  }
  loadRomatsaZones();

  /* ── Flight area drawing and approved reservations ───── */
  const flightAreaGroup = L.layerGroup().addTo(map);
  let drawingArea = false;
  let drawingPoints = [];
  let draftLine = null;
  let drawingMarkers = [];
  const drawButton = $('#drawAreaBtn');
  const undoPointButton = $('#undoAreaPoint');
  const finishAreaButton = $('#finishFlightArea');
  const clearAreaButton = $('#clearFlightArea');
  const drawStatus = $('#drawAreaStatus');

  function setDrawControls() {
    if (drawButton) {
      drawButton.textContent = drawingArea ? 'Cancel drawing' : (state.flightArea.length >= 3 ? 'Redraw flight area' : 'Draw flight area');
      drawButton.setAttribute('aria-pressed', drawingArea ? 'true' : 'false');
    }
    if (undoPointButton) undoPointButton.disabled = !drawingArea || drawingPoints.length === 0;
    if (finishAreaButton) finishAreaButton.hidden = !drawingArea || drawingPoints.length < 3;
    if (clearAreaButton) clearAreaButton.hidden = drawingArea || state.flightArea.length < 3;
    if (drawStatus && drawingArea) drawStatus.textContent = drawingPoints.length + ' point' + (drawingPoints.length === 1 ? '' : 's') + ' · add at least 3, then close the polygon.';
  }

  function clearDrawingLayers() {
    if (draftLine) flightAreaGroup.removeLayer(draftLine);
    draftLine = null;
    drawingMarkers.forEach(function (marker) { flightAreaGroup.removeLayer(marker); });
    drawingMarkers = [];
  }

  function paintDrawing() {
    clearDrawingLayers();
    if (drawingPoints.length >= 2) {
      draftLine = L.polyline(drawingPoints, { color: '#1976d2', weight: 3, dashArray: '7 6' }).addTo(flightAreaGroup);
    }
    drawingMarkers = drawingPoints.map(function (point, index) {
      return L.circleMarker(point, {
        radius: index === 0 ? 6 : 4,
        color: '#fff',
        weight: 2,
        fillColor: '#1976d2',
        fillOpacity: 1
      }).bindTooltip('Point ' + (index + 1)).addTo(flightAreaGroup);
    });
    setDrawControls();
  }

  function renderSavedFlightAreas() {
    flightAreaGroup.clearLayers();
    draftLine = null;
    drawingMarkers = [];
    if (drawingArea) {
      paintDrawing();
      return;
    }
    if (state.flightArea.length >= 3) {
      L.polygon(state.flightArea, {
        color: '#1976d2',
        weight: 2,
        dashArray: '7 6',
        fillColor: '#4a9cff',
        fillOpacity: 0.13
      }).bindTooltip('Proposed flight area · awaiting request').addTo(flightAreaGroup);
    }
    state.flightRequests.filter(function (request) {
      return request.status === 'approved' && Array.isArray(request.area) && request.area.length >= 3;
    }).forEach(function (request) {
      const polygon = L.polygon(request.area, {
        color: '#168a46',
        weight: 2.5,
        fillColor: '#30b566',
        fillOpacity: 0.22
      });
      polygon.bindTooltip('Approved reservation · ' + esc(request.id), { sticky: true });
      polygon.bindPopup(
        '<strong>Approved flight area</strong><br>' +
        esc(request.date) + ' · ' + esc(request.from) + '–' + esc(request.to) +
        '<br>' + esc(request.approvalReference || 'Approval recorded by operator') +
        '<br><small>Approval was recorded locally; verify the authority document and conditions.</small>'
      );
      polygon.addTo(flightAreaGroup);
    });
    setDrawControls();
  }

  function startAreaDrawing() {
    drawingArea = true;
    drawingPoints = [];
    map.doubleClickZoom.disable();
    paintDrawing();
    if (drawStatus) drawStatus.textContent = 'Click the map to add boundary points. Use at least 3 points.';
  }

  function stopAreaDrawing() {
    drawingArea = false;
    drawingPoints = [];
    map.doubleClickZoom.enable();
    renderSavedFlightAreas();
    if (drawStatus) drawStatus.textContent = state.flightArea.length >= 3
      ? 'Proposed polygon saved. Continue to flight details.'
      : 'Draw at least 3 points to outline your proposed area.';
  }

  function finishAreaDrawing() {
    if (drawingPoints.length < 3) {
      if (drawStatus) drawStatus.textContent = 'Add at least 3 boundary points before closing the polygon.';
      return;
    }
    state.flightArea = drawingPoints.map(function (point) { return [point.lat, point.lng]; });
    drawingArea = false;
    drawingPoints = [];
    map.doubleClickZoom.enable();
    renderSavedFlightAreas();
    save();
    window.dispatchEvent(new CustomEvent('altitude:area-selected', { detail: { area: state.flightArea } }));
    if (drawStatus) drawStatus.textContent = 'Area saved. Add aircraft, purpose and a candidate time.';
  }

  if (drawButton) drawButton.addEventListener('click', function () {
    if (drawingArea) stopAreaDrawing();
    else startAreaDrawing();
  });
  if (undoPointButton) undoPointButton.addEventListener('click', function () {
    drawingPoints.pop();
    paintDrawing();
  });
  if (finishAreaButton) finishAreaButton.addEventListener('click', finishAreaDrawing);
  if (clearAreaButton) clearAreaButton.addEventListener('click', function () {
    state.flightArea = [];
    save();
    renderSavedFlightAreas();
    if (drawStatus) drawStatus.textContent = 'Area cleared. Draw at least 3 points to continue.';
    window.dispatchEvent(new CustomEvent('altitude:area-cleared'));
  });
  map.on('click', function (event) {
    if (!drawingArea) return;
    drawingPoints.push(event.latlng);
    paintDrawing();
  });
  map.on('dblclick', function () {
    if (drawingArea && drawingPoints.length >= 3) finishAreaDrawing();
  });
  window.addEventListener('altitude:start-area-draw', function () {
    App.go('airspace');
    map.invalidateSize();
    startAreaDrawing();
  });
  window.addEventListener('altitude:flight-requests-updated', renderSavedFlightAreas);
  window.addEventListener('altitude:area-selected', renderSavedFlightAreas);
  renderSavedFlightAreas();

  function orientation(a, b, c) {
    return (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  }

  function onSegment(a, b, point) {
    return Math.min(a[0], b[0]) - 1e-10 <= point[0] && point[0] <= Math.max(a[0], b[0]) + 1e-10 &&
      Math.min(a[1], b[1]) - 1e-10 <= point[1] && point[1] <= Math.max(a[1], b[1]) + 1e-10;
  }

  function segmentsIntersect(a, b, c, d) {
    const o1 = orientation(a, b, c);
    const o2 = orientation(a, b, d);
    const o3 = orientation(c, d, a);
    const o4 = orientation(c, d, b);
    if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) &&
        ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))) return true;
    return (Math.abs(o1) < 1e-10 && onSegment(a, b, c)) ||
      (Math.abs(o2) < 1e-10 && onSegment(a, b, d)) ||
      (Math.abs(o3) < 1e-10 && onSegment(c, d, a)) ||
      (Math.abs(o4) < 1e-10 && onSegment(c, d, b));
  }

  function pointInRing(point, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i];
      const b = ring[j];
      const crosses = (a[1] > point[1]) !== (b[1] > point[1]) &&
        point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0];
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function ringsIntersect(a, b) {
    const polygonA = a.map(function (p) { return [p[1], p[0]]; });
    const polygonB = b.map(function (p) { return [p[1], p[0]]; });
    if (polygonA.some(function (p) { return pointInRing(p, polygonB); }) ||
        polygonB.some(function (p) { return pointInRing(p, polygonA); })) return true;
    if (polygonA.length && (polygonA[0][0] !== polygonA[polygonA.length - 1][0] || polygonA[0][1] !== polygonA[polygonA.length - 1][1])) polygonA.push(polygonA[0]);
    if (polygonB.length && (polygonB[0][0] !== polygonB[polygonB.length - 1][0] || polygonB[0][1] !== polygonB[polygonB.length - 1][1])) polygonB.push(polygonB[0]);
    for (let i = 0; i < polygonA.length - 1; i++) {
      for (let j = 0; j < polygonB.length - 1; j++) {
        if (segmentsIntersect(polygonA[i], polygonA[i + 1], polygonB[j], polygonB[j + 1])) return true;
      }
    }
    return false;
  }

  function geometryRings(geometry) {
    if (!geometry) return [];
    if (geometry.type === 'Polygon') return geometry.coordinates.slice(0, 1);
    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.map(function (polygon) { return polygon[0]; });
    }
    return [];
  }

  App.findRomatsaRules = function (area) {
    if (!romatsaLoaded || !Array.isArray(area) || area.length < 3) return [];
    return romatsaFeatures.filter(function (feature) {
      return geometryRings(feature.geometry).some(function (ring) {
        return ringsIntersect(area, ring.map(function (point) { return [point[1], point[0]]; }));
      });
    }).map(function (feature) {
      return Object.assign({}, feature.properties || {});
    });
  };
  App.getRomatsaStatus = function () {
    return { loaded: romatsaLoaded, error: romatsaError };
  };
  App.areasOverlap = ringsIntersect;
  App.getFlightArea = function () { return state.flightArea.slice(); };
  window.addEventListener('altitude:language', function () {
    updateRomatsaStatus();
    const selected = App.getZone(state.zoneId);
    if (selected) updateBadge(selected);
  });

  /* ── Airspace ─────────────────────────────────────────── */
  const zoneGroup = L.layerGroup();
  const notamGroup = L.layerGroup();
  const airspaceGroup = L.layerGroup([zoneGroup, notamGroup]);
  const zoneLayers = {};
  const ZONE_ORDER = ['otopeni', 'baneasa', 'palace', 'clinceni', 'corridor', 'park', 'morii'];

  DATA.ZONES.forEach(function (z) {
    const color = COLORS[z.status];
    const options = {
      color: color,
      weight: 1.6,
      opacity: 0.9,
      fillColor: color,
      fillOpacity: 0.14,
      dashArray: z.status === 'restricted' ? '5 5' : z.status === 'advisory' ? '2 4' : null,
      className: 'zone-shape zone-' + z.status
    };
    let layer;
    if (z.geometry.k === 'circle') {
      layer = L.circle(z.center, Object.assign({ radius: z.geometry.radius }, options));
    } else {
      layer = L.polygon(z.geometry.points, options);
    }
    const labelOffset = z.id === 'corridor' ? L.point(30, -22) : z.id === 'clinceni' ? L.point(76, -46) : L.point(0, 0);
    layer.bindTooltip(
      '<span>' + esc(z.short) + '</span><small>' + esc(z.ceiling) + '</small>',
      { permanent: true, direction: 'center', offset: labelOffset, className: 'zone-label leaflet-zone-label zone-label-' + z.status, interactive: false }
    );
    layer.on('click', function (e) {
      if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
      selectZone(z.id, false);
    });
    layer.on('mouseover', function () { if (z.id !== state.zoneId) layer.setStyle({ fillOpacity: 0.22 }); });
    layer.on('mouseout', function () { if (z.id !== state.zoneId) layer.setStyle({ fillOpacity: 0.14 }); });
    layer.addTo(zoneGroup);
    zoneLayers[z.id] = layer;
  });

  NOTAMS.forEach(function (n) {
    L.circleMarker([n.lat, n.lon], {
      radius: 7,
      color: '#FF9F0A',
      weight: 2,
      fillColor: '#FF9F0A',
      fillOpacity: 0.25
    }).bindTooltip(n.title, { direction: 'top', className: 'notam-tip' })
      .bindPopup('<strong>' + esc(n.title) + '</strong><br><span>' + esc(n.detail) + '</span><br><small>Demo NOTAM · not for navigation</small>')
      .addTo(notamGroup);
  });

  /* ── User marker ──────────────────────────────────────── */
  const userIcon = L.divIcon({
    className: 'user-marker',
    html: '<span class="user-pulse"></span><span class="user-dot"></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
  const userMarker = L.marker([44.4625, 26.0788], {
    icon: userIcon,
    interactive: false,
    zIndexOffset: 900
  }).addTo(map).bindTooltip('Your position · demo', { direction: 'top', className: 'user-tip' });

  /* ── Traffic ──────────────────────────────────────────── */
  const trafficGroup = L.layerGroup().addTo(map);
  const markers = {};
  let trafficOn = true;
  let started = false;
  let trafficTimer = null;
  let active = false;
  let demoMode = !(state.settings.fr24Token || '').trim();
  let demoPlanes = [];
  let lastFetch = 0;
  let fetching = false;
  let lastCount = 0;
  let lastSource = 'Demo traffic';
  let lastNote = '';

  function planeIcon(track, alt, demo) {
    const low = alt > 0 && alt < 5000;
    const cls = 'plane-marker' + (demo ? ' is-demo' : '') + (alt === 0 ? ' is-ground' : low ? ' is-low' : '');
    return L.divIcon({
      className: cls,
      html: '<span class="plane-halo"></span><svg viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(' + (Number(track) || 0) + 'deg)"><path d="M12 2.2c.8 0 1.4 1.6 1.5 4.1l.1 3.9 7 4.2v2l-7-2.2v4.1l2.1 1.6v1.5L12 21l-3.7.9v-1.5l2.1-1.6v-4.1l-7 2.2v-2l7-4.2.1-3.9C10.6 3.8 11.2 2.2 12 2.2Z"/></svg>',
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
  }

  function planePopup(f, demo) {
    const alt = Number(f.alt) || 0;
    const speed = Number(f.gspeed) || 0;
    const route = f.orig_iata && f.dest_iata ? f.orig_iata + ' → ' + f.dest_iata : '';
    const link = 'https://www.flightradar24.com/' + encodeURIComponent(f.callsign || f.flight || '');
    return '<div class="plane-pop">' +
      '<p class="eyebrow">' + (demo ? 'Demo traffic' : 'Live · Flightradar24') + '</p>' +
      '<h3>' + esc(f.callsign || f.flight || 'Aircraft') + '</h3>' +
      '<p class="plane-sub">' + esc([f.type, f.reg].filter(Boolean).join(' · ') || 'Traffic near Bucharest') + '</p>' +
      (route ? '<p class="plane-route">' + esc(route) + '</p>' : '') +
      '<dl class="plane-facts">' +
        '<div><dt>Altitude</dt><dd>' + alt.toLocaleString('en-GB') + ' ft<small>' + Math.round(alt * 0.3048) + ' m</small></dd></div>' +
        '<div><dt>Ground speed</dt><dd>' + Math.round(speed) + ' kt<small>' + Math.round(speed * 1.852) + ' km/h</small></dd></div>' +
        '<div><dt>Heading</dt><dd>' + Math.round(Number(f.track) || 0) + '°</dd></div>' +
      '</dl>' +
      '<a class="link-out" href="' + esc(link) + '" target="_blank" rel="noopener">Open on Flightradar24' +
        '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></svg></a>' +
      (demo ? '<p class="plane-note">Simulated aircraft · add a Flightradar24 key for live positions.</p>' : '') +
      '</div>';
  }

  function syncPlanes(list, demo, source, note) {
    const seen = {};
    list.forEach(function (f) {
      const id = f.fr24_id || f.hex || f.callsign || (f.lat + ',' + f.lon);
      seen[id] = true;
      let marker = markers[id];
      if (!marker) {
        marker = L.marker([f.lat, f.lon], { icon: planeIcon(f.track, f.alt, demo), riseOnHover: true, zIndexOffset: 500 });
        marker.bindPopup(planePopup(f, demo), { className: 'plane-popup', maxWidth: 280 });
        marker.bindTooltip((f.callsign || f.flight || 'Aircraft') + (f.alt ? ' · ' + Number(f.alt).toLocaleString('en-GB') + ' ft' : ''), {
          direction: 'top', offset: [0, -10], className: 'plane-tip'
        });
        marker.addTo(trafficGroup);
        markers[id] = marker;
      } else {
        marker.setLatLng([f.lat, f.lon]);
        marker.setPopupContent(planePopup(f, demo));
        marker.setTooltipContent((f.callsign || f.flight || 'Aircraft') + (f.alt ? ' · ' + Number(f.alt).toLocaleString('en-GB') + ' ft' : ''));
        const el = marker.getElement();
        if (el) {
          const svg = el.querySelector('svg');
          if (svg) svg.style.transform = 'rotate(' + (Number(f.track) || 0) + 'deg)';
        }
      }
      marker._altitude = f.alt;
    });
    Object.keys(markers).forEach(function (id) {
      if (!seen[id]) {
        trafficGroup.removeLayer(markers[id]);
        delete markers[id];
      }
    });
    lastCount = list.length;
    lastSource = source;
    lastNote = note || '';
    updateTrafficMeta(source, note);
  }

  function updateTrafficMeta(source, note) {
    const countEl = $('#trafficCount');
    const sourceEl = $('#trafficSource');
    const pill = $('#trafficPill');
    if (countEl) countEl.textContent = lastCount + ' aircraft';
    if (sourceEl) sourceEl.textContent = source + (note ? ' · ' + note : '');
    if (pill) {
      pill.classList.toggle('is-live', source === 'Flightradar24');
      pill.classList.toggle('is-demo', source !== 'Flightradar24');
      pill.classList.toggle('is-error', !!note);
      pill.title = note || (source === 'Flightradar24' ? 'Live positions from the Flightradar24 API' : 'Demo feed — add a Flightradar24 key in Profile');
    }
  }

  function makeDemoPlanes() {
    demoPlanes = DEMO_NAMES.map(function (n, i) {
      return {
        fr24_id: 'demo-' + i,
        flight: n[0],
        callsign: n[0],
        airline: n[1],
        type: n[2],
        reg: n[3],
        orig_iata: n[4],
        dest_iata: n[5],
        lat: 44.30 + Math.random() * 0.30,
        lon: 25.92 + Math.random() * 0.36,
        track: Math.round(Math.random() * 359),
        alt: i % 5 === 0 ? 0 : Math.round((2000 + Math.random() * 36000) / 100) * 100,
        gspeed: i % 5 === 0 ? 0 : Math.round(120 + Math.random() * 360)
      };
    });
    demoMode = true;
    syncPlanes(demoPlanes, true, 'Demo traffic', '');
  }

  function tickDemo() {
    if (!demoMode || !demoPlanes.length) return;
    const dt = 2;
    demoPlanes.forEach(function (f) {
      if (!f.gspeed) return;
      const km = f.gspeed * 1.852 * dt / 3600;
      const rad = (Number(f.track) || 0) * Math.PI / 180;
      f.lat += (Math.cos(rad) * km) / 111;
      f.lon += (Math.sin(rad) * km) / (111 * Math.cos(f.lat * Math.PI / 180));
      if (f.lat > 44.86 || f.lat < 44.14 || f.lon > 26.64 || f.lon < 25.60) {
        f.lat = 44.20 + Math.random() * 0.62;
        f.lon = 25.72 + Math.random() * 0.78;
        f.track = Math.round(Math.random() * 359);
      }
    });
    syncPlanes(demoPlanes, true, 'Demo traffic', lastNote);
  }

  function startDemo(note) {
    demoMode = true;
    lastNote = note || '';
    if (!demoPlanes.length) makeDemoPlanes();
    else syncPlanes(demoPlanes, true, 'Demo traffic', note || '');
    updateTrafficMeta('Demo traffic', note || '');
  }

  function boundsParam() {
    let b = map.getBounds();
    let n = Math.min(48.55, b.getNorth());
    let s = Math.max(43.35, b.getSouth());
    let w = Math.max(19.65, b.getWest());
    let e = Math.min(30.15, b.getEast());
    if (!isFinite(n) || !isFinite(s) || n <= s || e <= w) {
      n = 48.25; s = 43.65; w = 20.25; e = 29.75;
    }
    return [n, s, w, e].map((v) => v.toFixed(3)).join(',');
  }

  async function fetchTraffic(manual) {
    const token = (state.settings.fr24Token || '').trim();
    if (!token) {
      demoMode = true;
      startDemo('');
      if (manual) toast('Demo traffic — add a Flightradar24 key in Profile for live positions.');
      return;
    }
    if (fetching) return;
    fetching = true;
    const pill = $('#trafficPill');
    if (pill) pill.classList.add('is-loading');
    if (manual) toast('Contacting Flightradar24…');
    try {
      const res = await fetch(FR24_URL + '?bounds=' + boundsParam(), {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Accept-Version': 'v1',
          'Accept': 'application/json'
        }
      });
      if (!res.ok) {
        let detail = '';
        try { const j = await res.json(); detail = j.message || j.details || ''; } catch (e) { /* ignore */ }
        const err = new Error('HTTP ' + res.status + (detail ? ' · ' + detail : ''));
        err.status = res.status;
        throw err;
      }
      const json = await res.json();
      const data = Array.isArray(json.data) ? json.data : [];
      demoMode = false;
      syncPlanes(data, false, 'Flightradar24', '');
      lastFetch = Date.now();
      mapEl.classList.add('has-live-traffic');
      if (manual) toast('Flightradar24 · ' + data.length + ' aircraft in view.');
    } catch (err) {
      const note = err.status === 401 || err.status === 403 ? 'key rejected' : err.status === 402 ? 'no live plan' : err.status === 429 ? 'rate limit' : 'API unavailable';
      mapEl.classList.remove('has-live-traffic');
      startDemo(note);
      if (manual) toast('Flightradar24 unavailable (' + note + ') — showing demo traffic.');
    } finally {
      fetching = false;
      if (pill) pill.classList.remove('is-loading');
    }
  }

  function startTraffic() {
    if (!started) {
      started = true;
      trafficTimer = setInterval(function () {
        if (!active || document.hidden || !trafficOn) return;
        if (demoMode) tickDemo();
        else if (Date.now() - lastFetch > 30000) fetchTraffic(false);
      }, 2000);
    }
    if ((state.settings.fr24Token || '').trim()) fetchTraffic(false);
    else startDemo('');
  }

  function refreshTraffic() {
    if (demoMode) {
      startDemo('');
      tickDemo();
      updateTrafficMeta('Demo traffic', '');
      toast('Demo traffic refreshed.');
    } else {
      fetchTraffic(true);
    }
  }

  /* ── Detail, list, badge ──────────────────────────────── */
  function renderDetail(z) {
    const host = $('#zoneDetail');
    if (!host) return;
    const s = STATUS[z.status];
    const action = 'Plan a request';
    host.innerHTML =
      '<div class="zd-head"><span class="status status-' + z.status + '"><span class="dot"></span>' + s.label + '</span><span class="zd-code">' + esc(z.code) + '</span></div>' +
      '<h3>' + esc(z.name) + '</h3>' +
      '<p class="zd-blurb">' + esc(z.blurb) + '</p>' +
      '<dl class="zd-grid">' +
        '<div><dt>Type</dt><dd>' + esc(z.type) + '</dd></div>' +
        '<div><dt>Ceiling</dt><dd>' + esc(z.ceiling) + '</dd></div>' +
        '<div><dt>Class</dt><dd>' + esc(z.cls) + ' · floor ' + esc(z.floor) + '</dd></div>' +
        '<div><dt>Contact</dt><dd>' + esc(z.contact) + '</dd></div>' +
      '</dl>' +
      '<p class="zd-note">Approximate demo volume · not official AIP geometry</p>' +
      '<div class="zd-actions">' +
        '<button class="btn btn-primary btn-sm" type="button" data-authorize="' + z.id + '">' + action + '</button>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-focus="' + z.id + '">Center</button>' +
      '</div>';
  }

  function renderList() {
    const host = $('#zoneList');
    if (!host) return;
    host.innerHTML = DATA.ZONES.map(function (z) {
      return '<li><button class="zone-row' + (z.id === state.zoneId ? ' is-active' : '') + '" type="button" data-zone-row="' + z.id + '">' +
        '<span class="zdot ' + z.status + '"></span>' +
        '<span class="zone-row-body"><strong>' + esc(z.short) + '</strong><span>' + esc(STATUS[z.status].row) + ' · ' + esc(z.type) + '</span></span>' +
        '<span class="zone-row-ft">' + esc(z.ceiling) + '</span>' +
        '</button></li>';
    }).join('');
  }

  function updateBadge(z) {
    const title = $('#mapBadgeTitle');
    const sub = $('#mapBadgeSub');
    const dot = $('#mapBadgeDot');
    const romanian = document.documentElement.lang === 'ro-RO';
    if (title) title.textContent = (romanian ? 'Exemplu · ' : 'Demo · ') + z.name;
    if (sub) sub.textContent = (romanian ? 'Doar demo · ' : 'Sample only · ') + STATUS[z.status].label + ' · ' + z.ceiling;
    if (dot) dot.className = 'dot status-' + z.status;
  }

  function restyleZones() {
    Object.keys(zoneLayers).forEach(function (id) {
      const layer = zoneLayers[id];
      const selected = id === state.zoneId;
      layer.setStyle({ weight: selected ? 2.6 : 1.6, fillOpacity: selected ? 0.28 : 0.14, opacity: selected ? 1 : 0.9 });
      if (selected && layer.bringToFront) layer.bringToFront();
    });
  }

  function selectZone(id, center) {
    const z = App.getZone(id);
    if (!z) return;
    state.zoneId = id;
    save();
    restyleZones();
    renderDetail(z);
    renderList();
    updateBadge(z);
    if (center) centerOn(z);
  }

  function centerOn(z) {
    const layer = zoneLayers[z.id];
    if (!layer) return;
    const b = layer.getBounds ? layer.getBounds() : null;
    if (b && b.isValid && b.isValid()) {
      map.flyToBounds(b, { padding: [34, 34], maxZoom: 13, duration: 0.65 });
    } else {
      map.flyTo(z.center, 13, { duration: 0.65 });
    }
  }

  /* ── Layers UI ────────────────────────────────────────── */
  function syncSegments() {
    $$('.seg[data-layer]').forEach(function (btn) {
      const name = btn.getAttribute('data-layer');
      let on = false;
      if (name === 'romatsa') on = romatsaOn;
      else if (name === 'satellite') on = aerialOn;
      else if (name === 'airspace') on = map.hasLayer(airspaceGroup);
      else if (name === 'traffic') on = trafficOn;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('is-on', on);
    });
    if (aerialOpacityControl) aerialOpacityControl.hidden = !aerialOn;
    const mapLegend = $('#mapLegend');
    if (mapLegend) {
      mapLegend.hidden = !map.hasLayer(airspaceGroup);
      mapLegend.setAttribute('aria-hidden', mapLegend.hidden ? 'true' : 'false');
    }
  }

  $$('.seg[data-layer]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const name = btn.getAttribute('data-layer');
      if (name === 'romatsa') {
        romatsaOn = !romatsaOn;
        if (romatsaOn) romatsaGroup.addTo(map);
        else map.removeLayer(romatsaGroup);
        if (romatsaOn && !romatsaLoaded) loadRomatsaZones();
      } else if (name === 'satellite') {
        aerialOn = !aerialOn;
        if (aerialOn) {
          satellite.setOpacity(aerialOpacity ? Number(aerialOpacity.value) / 100 : 0.72);
          satellite.addTo(map);
        } else {
          map.removeLayer(satellite);
        }
      } else if (name === 'airspace') {
        if (map.hasLayer(airspaceGroup)) map.removeLayer(airspaceGroup);
        else airspaceGroup.addTo(map);
        if (zoneLayers[state.zoneId] && zoneLayers[state.zoneId].bringToFront) zoneLayers[state.zoneId].bringToFront();
      } else if (name === 'traffic') {
        trafficOn = !trafficOn;
        if (trafficOn) {
          trafficGroup.addTo(map);
          startTraffic();
        } else {
          map.removeLayer(trafficGroup);
        }
      }
      syncSegments();
    });
  });
  if (aerialOpacity) {
    aerialOpacity.addEventListener('input', function () {
      satellite.setOpacity(Number(aerialOpacity.value) / 100);
      state.settings.aerialOpacity = Number(aerialOpacity.value);
      save();
    });
  }
  syncSegments();

  /* ── Wiring ───────────────────────────────────────────── */
  const zoomIn = $('#zoomIn');
  if (zoomIn) zoomIn.addEventListener('click', function () { map.zoomIn(0.5); });
  const zoomOut = $('#zoomOut');
  if (zoomOut) zoomOut.addEventListener('click', function () { map.zoomOut(0.5); });

  const locate = $('#mapLocate');
  if (locate) {
    locate.addEventListener('click', function () {
      if (!navigator.geolocation) {
        map.flyTo([44.465, 26.07], 12.5, { duration: 0.6 });
        toast('Location is not available in this browser.');
        return;
      }
      locate.classList.add('is-busy');
      navigator.geolocation.getCurrentPosition(function (pos) {
        const ll = [pos.coords.latitude, pos.coords.longitude];
        userMarker.setLatLng(ll);
        userMarker.setTooltipContent('Your position');
        map.flyTo(ll, 14, { duration: 0.8 });
        locate.classList.remove('is-busy');
        toast('Map centred on your position.');
      }, function () {
        locate.classList.remove('is-busy');
        userMarker.setLatLng([44.4625, 26.0788]);
        map.flyTo([44.465, 26.07], 12.5, { duration: 0.6 });
        toast('Location unavailable — showing central Bucharest.');
      }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
    });
  }

  document.addEventListener('click', function (e) {
    const row = e.target.closest('[data-zone-row]');
    if (row) { selectZone(row.getAttribute('data-zone-row'), true); return; }
    const auth = e.target.closest('[data-authorize]');
    if (auth) {
      const id = auth.getAttribute('data-authorize');
      App.go('authorize');
      window.dispatchEvent(new CustomEvent('altitude:authorize-zone', { detail: { id: id } }));
      return;
    }
    const focus = e.target.closest('[data-focus]');
    if (focus) {
      const z = App.getZone(focus.getAttribute('data-focus'));
      if (z) centerOn(z);
    }
  });

  window.addEventListener('altitude:zone', function (e) {
    if (e.detail && e.detail.id) selectZone(e.detail.id, !!e.detail.center);
  });

  const trafficPill = $('#trafficPill');
  if (trafficPill) {
    trafficPill.addEventListener('click', function () {
      const hasKey = !!(state.settings.fr24Token || '').trim();
      const demo = demoMode;
      App.openSheet({
        kicker: 'Live map',
        title: 'Live traffic',
        body: '' +
          '<div class="traffic-sheet">' +
            '<div class="traffic-source ' + (demo ? 'is-demo' : 'is-live') + '">' +
              '<span class="live-dot"></span>' +
              '<div><strong>' + (demo ? 'Demo traffic' : 'Flightradar24 · live') + '</strong>' +
              '<small>' + lastCount + ' aircraft in view' + (lastNote ? ' · ' + esc(lastNote) : '') + '</small></div>' +
            '</div>' +
            '<p>' + (demo
              ? 'The map is showing a clearly-labelled simulated feed. Add a Flightradar24 API key in your profile to display real aircraft positions around Bucharest.'
              : 'Aircraft positions come directly from the Flightradar24 live API and refresh every 30 seconds while the map is open.') + '</p>' +
            '<dl class="traffic-facts">' +
              '<div><dt>Source</dt><dd>' + (demo ? 'Local demo feed' : 'Flightradar24 API v1') + '</dd></div>' +
              '<div><dt>API key</dt><dd>' + (hasKey ? 'Saved locally' : 'Not set') + '</dd></div>' +
              '<div><dt>Last update</dt><dd>' + (lastFetch && !demo ? new Date(lastFetch).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live demo') + '</dd></div>' +
            '</dl>' +
            '<p class="form-foot">Manned traffic always has right of way. Live positions are informational, not a separation service.</p>' +
          '</div>',
        actions: [
          { label: demo ? 'Open profile' : 'Refresh now', primary: true, onClick: function () {
            if (demo) { App.closeSheet(); App.go('profile'); }
            else { App.closeSheet(); refreshTraffic(); }
          } },
          { label: 'Close', quiet: true, onClick: function () { App.closeSheet(); } }
        ]
      });
    });
  }

  window.addEventListener('altitude:settings', function () {
    Object.keys(markers).forEach(function (id) { trafficGroup.removeLayer(markers[id]); delete markers[id]; });
    demoMode = !(state.settings.fr24Token || '').trim();
    demoPlanes = [];
    lastNote = '';
    if (trafficOn && active) startTraffic();
  });

  /* ── View lifecycle ───────────────────────────────────── */
  selectZone(state.zoneId || 'park', false);
  App.onView('airspace', function () {
    active = true;
    map.invalidateSize();
    startTraffic();
  });
  App.onView('today', function () { active = false; });
  App.onView('authorize', function () { active = false; });
  App.onView('profile', function () { active = false; });
  App.onView('learn', function () { active = false; });

  window.addEventListener('resize', function () { map.invalidateSize(); });

  App.map = map;
  App.selectZone = selectZone;
  App.refreshTraffic = refreshTraffic;
})(window.App);
