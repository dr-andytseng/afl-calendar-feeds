// Fetching and validation of fixturedownload.com full-season JSON feeds.
// Validation failures throw — the build must stop before any output is written.

import { CLUB_BY_UPSTREAM_LABEL } from "../config/clubs.js";

// A participant that is not a known club must look like a finals placeholder
// (e.g. "Winner of QF1", "Loser of SF2", "1st", "Lowest-ranked WF Winner").
const PLACEHOLDER_PATTERN =
  /^(\d+(st|nd|rd|th)\b|Winner of |Loser of |Highest-ranked |Lowest-ranked )/;

export function isKnownClub(label) {
  return CLUB_BY_UPSTREAM_LABEL.has(label);
}

export function isPlaceholder(label) {
  return typeof label === "string" && !isKnownClub(label) && PLACEHOLDER_PATTERN.test(label);
}

/**
 * Parse fixturedownload UTC strings like "2027-03-21 04:15:00Z". Returns ms or null.
 * Round-trips through the parsed Date to reject impossible calendar dates
 * (e.g. 2027-02-31) that Date.parse tolerates by rolling over.
 */
export function parseUtcToMs(str) {
  if (typeof str !== "string") return null;
  const trimmed = str.trim();
  const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(:(\d{2}))?Z?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, , s] = m;
  const ms = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0));
  const back = new Date(ms);
  if (
    back.getUTCFullYear() !== Number(y) ||
    back.getUTCMonth() !== Number(mo) - 1 ||
    back.getUTCDate() !== Number(d) ||
    back.getUTCHours() !== Number(h) ||
    back.getUTCMinutes() !== Number(mi)
  ) {
    return null;
  }
  return ms;
}

/**
 * Validate and normalize the raw feed.
 * Throws on any structural problem; returns normalized match objects on success.
 *
 * Normalized match: { matchNumber, roundNumber, startMs, homeTeam, awayTeam,
 *   location, homeScore, awayScore, homeClub (club|null), awayClub (club|null), uid }
 */
export function validateFixtures(raw, { season, uidPrefix, sourceUrl }) {
  if (!Array.isArray(raw)) {
    throw new Error(`${sourceUrl}: expected a JSON array, got ${typeof raw}`);
  }
  if (raw.length === 0) {
    throw new Error(`${sourceUrl}: feed contained 0 fixtures — refusing to publish empty calendars`);
  }

  const seen = new Set();
  const matches = [];

  for (const [index, f] of raw.entries()) {
    const where = `${sourceUrl} record #${index} (MatchNumber=${f?.MatchNumber})`;

    if (!Number.isInteger(f?.MatchNumber)) {
      throw new Error(`${where}: MatchNumber missing or not an integer`);
    }
    if (seen.has(f.MatchNumber)) {
      throw new Error(`${where}: duplicate MatchNumber ${f.MatchNumber}`);
    }
    seen.add(f.MatchNumber);

    if (f.RoundNumber != null && !Number.isInteger(f.RoundNumber)) {
      throw new Error(`${where}: RoundNumber is not an integer`);
    }

    const startMs = parseUtcToMs(f.DateUtc);
    if (startMs === null) {
      throw new Error(`${where}: missing/unparseable DateUtc ${JSON.stringify(f.DateUtc)}`);
    }
    if (new Date(startMs).getUTCFullYear() !== season) {
      throw new Error(`${where}: fixture date ${f.DateUtc} is not in season ${season}`);
    }

    for (const key of ["HomeTeam", "AwayTeam", "Location"]) {
      if (typeof f[key] !== "string" || f[key].trim() === "") {
        throw new Error(`${where}: ${key} missing or empty`);
      }
    }

    // Participants must be either a known club or a recognized finals placeholder.
    for (const key of ["HomeTeam", "AwayTeam"]) {
      const label = f[key];
      if (!isKnownClub(label) && !isPlaceholder(label)) {
        throw new Error(`${where}: unrecognized ${key} label ${JSON.stringify(label)}`);
      }
    }

    // Scores: either both present (numeric) or both absent.
    const homeScore = f.HomeTeamScore ?? null;
    const awayScore = f.AwayTeamScore ?? null;
    if ((homeScore === null) !== (awayScore === null)) {
      throw new Error(`${where}: only one of HomeTeamScore/AwayTeamScore present`);
    }
    if (homeScore !== null && (typeof homeScore !== "number" || typeof awayScore !== "number")) {
      throw new Error(`${where}: scores must be numeric`);
    }

    matches.push({
      matchNumber: f.MatchNumber,
      roundNumber: f.RoundNumber ?? null,
      startMs,
      homeTeam: f.HomeTeam,
      awayTeam: f.AwayTeam,
      location: f.Location,
      homeScore,
      awayScore,
      homeClub: CLUB_BY_UPSTREAM_LABEL.get(f.HomeTeam) ?? null,
      awayClub: CLUB_BY_UPSTREAM_LABEL.get(f.AwayTeam) ?? null,
      uid: `${uidPrefix}-${f.MatchNumber}@afl-calendar-feeds`,
    });
  }

  matches.sort((a, b) => a.startMs - b.startMs || a.matchNumber - b.matchNumber);
  return matches;
}

/** Fetch and validate one competition's full feed. Throws on any failure. */
export async function fetchAndValidate(competition, fetchImpl = fetch) {
  const res = await fetchImpl(competition.sourceUrl, {
    headers: { "User-Agent": "afl-calendar-feeds/2.0 (+https://github.com/dr-andytseng/afl-calendar-feeds)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`${competition.sourceUrl}: HTTP ${res.status}`);
  }
  let raw;
  try {
    raw = await res.json();
  } catch (err) {
    throw new Error(`${competition.sourceUrl}: invalid JSON — ${err.message}`);
  }
  return validateFixtures(raw, competition);
}
