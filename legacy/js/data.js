/* Aerio — demo content, real-world coordinates & legal references */
(function () {
  'use strict';

  // Volumes are approximate demonstration geometry, not official AIP data.
  const ZONES = [
    {
      id: 'otopeni',
      name: 'CTR Otopeni',
      short: 'Otopeni',
      code: 'LRBB-CTR-01',
      type: 'Controlled area',
      status: 'restricted',
      ceiling: 'FL 105',
      floor: 'SFC',
      cls: 'C',
      contact: 'ROMATSA ATC',
      window: 'No windows today',
      center: [44.5711, 26.0850],
      geometry: { k: 'circle', radius: 7600 },
      blurb: 'Arrival and departure corridor for Henri Coandă. Drone flight needs ATC coordination and a CAA clearance, usually outside peak hours.'
    },
    {
      id: 'baneasa',
      name: 'CTR Băneasa',
      short: 'Băneasa',
      code: 'LRBB-CTR-02',
      type: 'Controlled area',
      status: 'restricted',
      ceiling: '2 500 ft',
      floor: 'SFC',
      cls: 'C',
      contact: 'ROMATSA ATC',
      window: 'No windows today',
      center: [44.5032, 26.1021],
      geometry: { k: 'circle', radius: 3600 },
      blurb: 'A smaller control zone tucked beneath Otopeni. Ceilings change with traffic, so clearance is decided slot by slot.'
    },
    {
      id: 'clinceni',
      name: 'Aerodrom Clinceni',
      short: 'Clinceni',
      code: 'LRCL-AD',
      type: 'Aerodrome zone',
      status: 'advisory',
      ceiling: '900 m AGL',
      floor: 'SFC',
      cls: 'G',
      contact: 'Aerodrome office',
      window: 'Check by phone',
      center: [44.3603, 25.9297],
      geometry: { k: 'circle', radius: 2800 },
      blurb: 'Gliders and ultralights fly circuits here at weekends. A quick call is enough on quiet weekdays — conditions may apply.'
    },
    {
      id: 'park',
      name: 'Parcul Herăstrău',
      short: 'Herăstrău',
      code: 'LRBB-RZ-14',
      type: 'Recreational zone',
      status: 'open',
      ceiling: '120 m AGL',
      floor: 'SFC',
      cls: 'G',
      contact: 'CAA UAS desk',
      window: '13:00 — 15:00',
      center: [44.4688, 26.0785],
      geometry: {
        k: 'polygon',
        points: [
          [44.4776, 26.0712], [44.4772, 26.0850], [44.4722, 26.0914],
          [44.4650, 26.0900], [44.4604, 26.0836], [44.4598, 26.0732],
          [44.4645, 26.0660], [44.4715, 26.0648]
        ]
      },
      blurb: 'An open class G pocket above the park and the lake. Soft afternoon light, and a 120 m ceiling keeps you clear of the CTR shelf.'
    },
    {
      id: 'morii',
      name: 'Lacul Morii',
      short: 'Morii',
      code: 'LRBB-RZ-22',
      type: 'Recreational zone',
      status: 'open',
      ceiling: '120 m AGL',
      floor: 'SFC',
      cls: 'G',
      contact: 'CAA UAS desk',
      window: '13:00 — 15:00',
      center: [44.4400, 26.0290],
      geometry: { k: 'circle', radius: 900 },
      blurb: 'Wide water and empty shoreline — the freestyle practice spot. Steady onshore breeze, no people under the flight path.'
    },
    {
      id: 'corridor',
      name: 'Coridorul A1',
      short: 'A1',
      code: 'LRBB-COR-03',
      type: 'Transit corridor',
      status: 'open',
      ceiling: '120 m AGL',
      floor: '60 m AGL',
      cls: 'G',
      contact: 'CAA UAS desk',
      window: '13:00 — 15:00',
      center: [44.4450, 26.0250],
      geometry: {
        k: 'polygon',
        points: [
          [44.5150, 25.9950], [44.5040, 26.0090], [44.4600, 26.0290],
          [44.4120, 26.0500], [44.3800, 26.0620], [44.3740, 26.0500],
          [44.4100, 26.0380], [44.4550, 26.0160], [44.4990, 25.9950], [44.5100, 25.9840]
        ]
      },
      blurb: 'A low-altitude lane threading between the two CTRs. Keep 50 m from the banks and stay under 120 m for the whole crossing.'
    },
    {
      id: 'palace',
      name: 'Palatul Parlamentului',
      short: 'Parlament',
      code: 'LRBB-P-07',
      type: 'Restricted area',
      status: 'restricted',
      ceiling: 'SFC — 1 500 ft',
      floor: 'SFC',
      cls: 'P',
      contact: 'CAA UAS desk',
      window: 'Never',
      center: [44.4255, 26.0875],
      geometry: { k: 'circle', radius: 700 },
      blurb: 'A permanent no-fly ring around the Palace. Most flight apps geofence it; there is no recreational access and no same-day exception.'
    }
  ];

  const WINDOWS = [
    { start: '13:00', end: '15:00', label: 'Open corridor', note: 'Best light for photos' },
    { start: '16:00', end: '16:30', label: 'Short window', note: 'One battery, quick hop' }
  ];

  const RECS = [
    { id: 'morii', kind: 'freestyle', title: 'Lacul Morii', sub: 'Freestyle practice · open water, steady breeze', zone: 'morii' },
    { id: 'park', kind: 'photo', title: 'Parcul Herăstrău', sub: 'Photography · golden light around 13:40', zone: 'park' },
    { id: 'corridor', kind: 'transit', title: 'Coridorul A1', sub: 'Transit lane · keep 50 m from the banks', zone: 'corridor' }
  ];

  const CHECKLIST = [
    'Battery charged and contacts inspected',
    'Propellers mounted, no cracks or nicks',
    'Firmware and geofence up to date',
    'Airspace re-checked, no new NOTAMs',
    'Visual observer briefed and in position'
  ];

  const CERTS = {
    a1a3: {
      id: 'a1a3',
      label: 'A1 / A3',
      covers: ['A1', 'A3'],
      note: 'Online test. Covers C0, C1, C3 and C4 drones in the open category.',
      url: 'https://www.caa.ro/'
    },
    a2: {
      id: 'a2',
      label: 'A2',
      covers: ['A2'],
      note: 'Additional exam. Required for C2 drones between 900 g and 4 kg.',
      url: 'https://www.caa.ro/'
    }
  };

  const LEGAL = [
    {
      label: 'Mapn — aerial filming & photography',
      url: 'https://aerofoto.mapn.ro/Help/Legislatie',
      note: 'The Ministry of Defence approval portal and the national legislation list.'
    },
    {
      label: 'CAA Romania — UAS operator',
      url: 'https://www.caa.ro/',
      note: 'Operator registration, A1/A3 and A2 certificates, insurance.'
    },
    {
      label: 'EU 2019/947 — UAS operations',
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019R0947',
      note: 'Open category rules, A1/A2/A3, 120 m ceiling, VLOS.'
    },
    {
      label: 'EU 2019/945 — UAS products',
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019R0945',
      note: 'Class marking C0–C4, remote identification and product rules.'
    },
    {
      label: 'HG 859/2021 — flight authorization',
      url: 'https://legislatie.just.ro/Public/DetaliiDocument/245405',
      note: 'Romanian procedure for authorizing flights in national airspace.'
    }
  ];

  const MODULES = [
    {
      id: 'm1',
      icon: 'user',
      level: 'Start here',
      minutes: 8,
      lessons: 4,
      title: 'Register as a UAS operator',
      summary: 'The one-time step before any flight: operator ID, class marking, insurance.',
      body: `
        <p>Before your first flight in the open category you register once with the Civil Aeronautic Authority. The registration is tied to you, not to the aircraft, and it follows you across every drone you fly.</p>
        <h3>What you need</h3>
        <ul class="bullets">
          <li>An identity document and a contact email you actually read.</li>
          <li>The class marking of your drone (C0–C4) and its serial number.</li>
          <li>Proof of insurance if your drone weighs more than 250 g.</li>
          <li>A few minutes — the online form is shorter than it looks.</li>
        </ul>
        <h3>What you get back</h3>
        <p>An operator registration number in the form <em>ROA-YYYY-NNNNNN</em>. Print it or write it on a label and attach it visibly to the airframe. Inspectors ask for it on the spot.</p>
        <div class="callout"><strong>Keep it sticky.</strong> The number goes on the drone, the certificate goes in your bag. Screenshots on a phone are accepted, but a laminated card survives a wet field.</div>
        <h3>Common slip</h3>
        <p>People register the drone instead of themselves. If you buy a second aircraft you do not register again — you simply add the serial number to your operator account.</p>
      `
    },
    {
      id: 'm2',
      icon: 'map',
      level: 'Foundation',
      minutes: 12,
      lessons: 6,
      title: 'Read the airspace',
      summary: 'CTR, class G, corridors — and how to read the zones on the live map.',
      body: `
        <p>Airspace is a stack of volumes, not a flat map. The two letters that matter most for a beginner are <strong>CTR</strong> and <strong>G</strong>.</p>
        <h3>CTR — controlled</h3>
        <p>A control zone protects an airport. Inside it, someone is responsible for separating traffic, and that someone is not you. A drone flight there needs a clearance with a time window and a ceiling.</p>
        <h3>Class G — open</h3>
        <p>Outside controlled volumes, class G is where recreational flight lives. You still owe see-and-avoid, a 120 m ceiling, and distance from people and property.</p>
        <h3>Traffic</h3>
        <p>The map shows live aircraft around Bucharest through the Flightradar24 API when a key is configured, and a clearly-labelled demo feed otherwise. Manned traffic always has right of way.</p>
        <div class="callout"><strong>Read the shelf, not just the circle.</strong> Many CTRs have stepped shelves. A point can be legal at 50 m and illegal at 100 m on the same GPS coordinate.</div>
        <h3>On this map</h3>
        <p>Green is flyable, amber needs a phone call, red needs an authority. Tap any zone to see its floor and ceiling before you plan a shot.</p>
      `
    },
    {
      id: 'm3',
      icon: 'check',
      level: 'Habit',
      minutes: 6,
      lessons: 3,
      title: 'The five-minute pre-flight',
      summary: 'Battery, props, geofence, observer, weather — the ritual that prevents most incidents.',
      body: `
        <p>Most drone incidents are boring: a prop with a hairline crack, a geofence left on from another country, a gust at 80 m that never reached the ground.</p>
        <h3>The ritual</h3>
        <ul class="bullets">
          <li><strong>Battery.</strong> Charge to full, check for swelling, inspect the contacts.</li>
          <li><strong>Props.</strong> Flex each blade. A crack you can feel is a crack that will fail.</li>
          <li><strong>Geofence.</strong> Confirm the map, the ceiling and the return-to-home altitude.</li>
          <li><strong>Observer.</strong> One person watches the sky while you watch the screen.</li>
          <li><strong>Weather.</strong> Wind at altitude, not at your feet. Check the gust spread.</li>
        </ul>
        <div class="callout"><strong>Say it out loud.</strong> A checklist you mutter to yourself gets skipped. A checklist you say to a second person gets done.</div>
        <h3>After landing</h3>
        <p>Power down before handling props, then log the flight: time, place, ceiling, anything unusual. Two lines are enough, and they are worth their weight when you apply for a higher category.</p>
      `
    },
    {
      id: 'm4',
      icon: 'book',
      level: 'Certification',
      minutes: 20,
      lessons: 5,
      title: 'Exam day: A1 / A3',
      summary: 'What the online exam asks, and the three mistakes that fail most candidates.',
      body: `
        <p>The A1/A3 certificate is a multiple-choice exam taken online after a short course. It is not hard, but it is precise — the questions reward the conservative answer.</p>
        <h3>What it covers</h3>
        <ul class="bullets">
          <li>Airspace classes and where recreational flight is allowed.</li>
          <li>Right of way and see-and-avoid behaviour around manned aircraft.</li>
          <li>Privacy, people and property — the parts that carry real liability.</li>
          <li>Weather limits, battery behaviour and emergency procedures.</li>
        </ul>
        <h3>The three mistakes</h3>
        <p><strong>One:</strong> answering what your drone <em>can</em> do instead of what the rules allow. <strong>Two:</strong> forgetting that a manned aircraft always has right of way, even when it appears unexpectedly. <strong>Three:</strong> treating the 120 m limit as a target rather than a ceiling.</p>
        <div class="callout"><strong>When in doubt, choose the safer answer.</strong> The exam is written so that the cautious option is almost always the correct one.</div>
        <h3>After you pass</h3>
        <p>Keep the certificate PDF on your phone and a printed copy in your case. Registration plus certificate plus insurance is the trio an inspector will ask for.</p>
      `
    }
  ];

  const EXAM = [
    {
      q: 'What is the maximum altitude for open-category drone flight without special authorization?',
      options: ['60 m above ground', '120 m above ground', '150 m above ground', '500 ft above sea level'],
      answer: 1,
      why: 'The open category ceiling is 120 m above the surface, and it is a ceiling — not a target.'
    },
    {
      q: 'A manned helicopter appears near your flight area. What do you do?',
      options: ['Climb to stay above it', 'Hold position and keep filming', 'Descend, move away and land as soon as it is safe', 'Radio the tower on the drone app'],
      answer: 2,
      why: 'Manned aircraft always have right of way. Put distance and altitude between you, then land.'
    },
    {
      q: 'Which certificate is required for a C2 drone weighing 1.2 kg?',
      options: ['A1/A3 only', 'A2', 'No certificate under 4 kg', 'A specific-category authorization'],
      answer: 1,
      why: 'C2 covers 900 g – 4 kg and requires the A2 certificate of competency.'
    }
  ];

  const ONBOARD = [
    {
      kicker: 'Welcome',
      title: 'Fly with confidence',
      copy: 'Aerio brings Romania airspace information, your operator file and flight-planning documents together in one place.',
      next: 'Show me around'
    },
    {
      kicker: 'Live map',
      title: 'Real streets, live traffic',
      copy: 'Pan and zoom a real Bucharest map. Airspace volumes, NOTAMs and live aircraft sit on top. Add a Flightradar24 API key in your profile for real positions; a clearly-labelled demo feed works without one.',
      next: 'Next'
    },
    {
      kicker: 'Authorizations',
      title: 'Legal by design',
      copy: 'Complete your operator file, add your drones and certificates once. Every request checks the drone weight class against your certificate before it files with the CAA and ROMATSA.',
      next: 'Start flying'
    }
  ];

  const DEFAULT_PROFILE = {
    name: 'Alex Ionescu',
    email: 'alex@aerio.app',
    phone: '+40 721 000 000',
    operatorId: 'ROA-2026-118704',
    registration: 'ROUAS-2026-0042',
    insurance: 'EU-DRONE-8841',
    insuranceUntil: '2027-04-18',
    address: 'Sector 1, Bucharest'
  };

  const DEFAULT_CERTS = {
    a1a3: { have: true, date: '2025-09-12', ref: 'A1A3-RO-88214' },
    a2: { have: true, date: '2026-02-03', ref: 'A2-RO-40118' }
  };

  const DEFAULT_DRONES = [
    {
      id: 'd_bluebird',
      nickname: 'Bluebird',
      model: 'DJI Air 3S',
      weight: 724,
      serial: '1581F5FKD23B00A9X21',
      registration: 'RO-UAS-0042-2026',
      remoteId: 'RID-3S-0042',
      camera: '1-inch CMOS · 50 MP',
      notes: 'Main photo platform.'
    },
    {
      id: 'd_feather',
      nickname: 'Feather',
      model: 'DJI Mini 4 Pro',
      weight: 249,
      serial: '1581F5FKD23B00B4M12',
      registration: 'RO-UAS-0043-2026',
      remoteId: 'RID-M4P-0043',
      camera: '1/1.3-inch CMOS · 48 MP',
      notes: 'Travel and A1 flights.'
    },
    {
      id: 'd_atlas',
      nickname: 'Atlas',
      model: 'Autel EVO II Pro',
      weight: 1191,
      serial: 'AUTEL-EVO2-99184',
      registration: 'RO-UAS-0044-2026',
      remoteId: 'RID-EVO-0044',
      camera: '1-inch CMOS · 6K',
      notes: 'C2 platform — needs the A2 certificate.'
    }
  ];

  const DEFAULT_SETTINGS = {
    fr24Token: '',
    trafficEnabled: true,
    language: 'en',
    aerialOpacity: 72
  };

  window.ALT_DATA = {
    ZONES, WINDOWS, RECS, CHECKLIST, MODULES, EXAM, ONBOARD,
    CERTS, LEGAL, DEFAULT_PROFILE, DEFAULT_CERTS, DEFAULT_DRONES, DEFAULT_SETTINGS
  };
})();
