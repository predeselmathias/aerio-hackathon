export const towerOptions = [
  "Arad-LRAR",
  "Bacău-LRBC",
  "Baia Mare-LRBM",
  "Brasov-LRBV",
  "București Băneasa- LRBS",
  "București Otopeni- LROP",
  "Cluj-Napoca-LRCL",
  "Constanța-LRCK",
  "Craiova-LRCV",
  "Iași-LRIA",
  "Oradea-LROD",
  "Satu Mare-LRSM",
  "Sibiu-LRSB",
  "Suceava-LRSV",
  "Târgu Mureș-LRTM",
  "Timișoara-LRTR",
  "Tulcea-LRTC",
] as const;

const towerContacts: {
  pattern: RegExp;
  option: (typeof towerOptions)[number];
}[] = [
  { pattern: /\btwr\.arad@romatsa\.ro\b/i, option: "Arad-LRAR" },
  { pattern: /\btwr\.bacau@romatsa\.ro\b/i, option: "Bacău-LRBC" },
  { pattern: /\btwr\.baiamare@romatsa\.ro\b/i, option: "Baia Mare-LRBM" },
  { pattern: /\btwr\.lrbs@romatsa\.ro\b/i, option: "București Băneasa- LRBS" },
  { pattern: /\bdrone\.otp@romatsa\.ro\b/i, option: "București Otopeni- LROP" },
  {
    pattern: /\b(?:app)?twr\.cluj@romatsa\.ro\b/i,
    option: "Cluj-Napoca-LRCL",
  },
  { pattern: /\bdrone\.lrck@romatsa\.ro\b/i, option: "Constanța-LRCK" },
  { pattern: /\baro\.lrcv@romatsa\.ro\b/i, option: "Craiova-LRCV" },
  { pattern: /\btwr\.iasi@romatsa\.ro\b/i, option: "Iași-LRIA" },
  { pattern: /\baro\.lrod@romatsa\.ro\b/i, option: "Oradea-LROD" },
  { pattern: /\baro\.lrsm@romatsa\.ro\b/i, option: "Satu Mare-LRSM" },
  { pattern: /\btwr\.lrsb@romatsa\.ro\b/i, option: "Sibiu-LRSB" },
  { pattern: /\btwr\.suceava@romatsa\.ro\b/i, option: "Suceava-LRSV" },
  { pattern: /\bdrone\.mures@romatsa\.ro\b/i, option: "Târgu Mureș-LRTM" },
  { pattern: /\btwr\.lrtr@romatsa\.ro\b/i, option: "Timișoara-LRTR" },
  { pattern: /\btwr\.tulcea@romatsa\.ro\b/i, option: "Tulcea-LRTC" },
  { pattern: /\btwr\.brasov@romatsa\.ro\b/i, option: "Brasov-LRBV" },
];

const towerContactPattern =
  /\b(?:(?:app)?twr|drone|aro)\.[a-z0-9._-]+@romatsa\.ro\b/i;

function normalizeTowerContact(contact: string): string {
  return contact.replace(/@romatsa\.rofor\b/gi, "@romatsa.ro");
}

export function getTowerOptions(contacts: string[]): string[] {
  const found = new Set<string>();
  for (const contact of contacts) {
    const normalized = normalizeTowerContact(contact);
    for (const { pattern, option } of towerContacts) {
      if (pattern.test(normalized)) {
        found.add(option);
      }
    }
  }
  return [...found];
}

export function hasUnmappedTowerContact(contacts: string[]): boolean {
  return contacts.some((contact) => {
    const normalized = normalizeTowerContact(contact);
    return (
      towerContactPattern.test(normalized) &&
      !towerContacts.some(({ pattern }) => pattern.test(normalized))
    );
  });
}

export function isTowerContact(contact: string): boolean {
  return towerContactPattern.test(normalizeTowerContact(contact));
}
