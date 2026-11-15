// Explicit, independent competition configuration.
// Seasons are NOT derived from the current date and there is no automatic fallback.
// Bump `season` (and `sourceUrl`) here, deliberately, when a new season is published.
//
// estimatedDurationMinutes is a calendar scheduling estimate only —
// it is NOT the actual duration of a match.

export const COMPETITIONS = [
  {
    key: "afl",
    label: "AFL",
    season: 2027,
    sourceUrl: "https://fixturedownload.com/feed/json/afl-2027",
    // Men's AFL matches are typically ~2–2.5 h including breaks; 150 min is an estimate.
    estimatedDurationMinutes: 150,
    // Output paths are relative to docs/. Men's public paths must remain unchanged.
    outputDir: "",
    aggregateSlug: "all-teams",
    aggregateCalName: "AFL 2027 – All Teams",
    prodid: "-//afl-ical-bot//AFL 2027 All Teams//EN",
    teamProdid: (slug) => `-//afl-ical-bot//AFL 2027 ${slug}//EN`,
    teamCalName: (displayName) => `AFL 2027 – ${displayName}`,
    uidPrefix: "afl-2027",
  },
  {
    key: "aflw",
    label: "AFLW",
    season: 2026,
    sourceUrl: "https://fixturedownload.com/feed/json/aflw-2026",
    // AFLW quarters are shorter (4 x 16 min); 120 min is a scheduling estimate.
    estimatedDurationMinutes: 120,
    outputDir: "aflw",
    aggregateSlug: "all-teams",
    aggregateCalName: "AFLW 2026 – All Teams",
    prodid: "-//afl-ical-bot//AFLW 2026 All Teams//EN",
    teamProdid: (slug) => `-//afl-ical-bot//AFLW 2026 ${slug}//EN`,
    teamCalName: (displayName) => `AFLW 2026 – ${displayName}`,
    uidPrefix: "aflw-2026",
  },
];
