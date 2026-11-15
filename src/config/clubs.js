// Canonical club metadata for all 18 AFL/AFLW clubs.
// `upstreamLabel` is the exact HomeTeam/AwayTeam string used by fixturedownload.com.
export const CLUBS = [
  { slug: "adelaide-crows",    displayName: "Adelaide Crows",    upstreamLabel: "Adelaide Crows" },
  { slug: "brisbane-lions",    displayName: "Brisbane Lions",    upstreamLabel: "Brisbane Lions" },
  { slug: "carlton",           displayName: "Carlton Blues",     upstreamLabel: "Carlton" },
  { slug: "collingwood",       displayName: "Collingwood Magpies", upstreamLabel: "Collingwood" },
  { slug: "essendon",          displayName: "Essendon Bombers",  upstreamLabel: "Essendon" },
  { slug: "fremantle",         displayName: "Fremantle Dockers", upstreamLabel: "Fremantle" },
  { slug: "geelong-cats",      displayName: "Geelong Cats",      upstreamLabel: "Geelong Cats" },
  { slug: "gold-coast-suns",   displayName: "Gold Coast Suns",   upstreamLabel: "Gold Coast SUNS" },
  { slug: "gws-giants",        displayName: "GWS Giants",        upstreamLabel: "GWS GIANTS" },
  { slug: "hawthorn",          displayName: "Hawthorn Hawks",    upstreamLabel: "Hawthorn" },
  { slug: "melbourne",         displayName: "Melbourne Demons",  upstreamLabel: "Melbourne" },
  { slug: "north-melbourne",   displayName: "North Melbourne Kangaroos", upstreamLabel: "North Melbourne" },
  { slug: "port-adelaide",     displayName: "Port Adelaide Power", upstreamLabel: "Port Adelaide" },
  { slug: "richmond",          displayName: "Richmond Tigers",   upstreamLabel: "Richmond" },
  { slug: "st-kilda",          displayName: "St Kilda Saints",   upstreamLabel: "St Kilda" },
  { slug: "sydney-swans",      displayName: "Sydney Swans",      upstreamLabel: "Sydney Swans" },
  { slug: "west-coast-eagles", displayName: "West Coast Eagles", upstreamLabel: "West Coast Eagles" },
  { slug: "western-bulldogs",  displayName: "Western Bulldogs",  upstreamLabel: "Western Bulldogs" },
];

export const CLUB_BY_UPSTREAM_LABEL = new Map(CLUBS.map((c) => [c.upstreamLabel, c]));
