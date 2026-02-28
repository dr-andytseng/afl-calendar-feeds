#!/usr/bin/env node
// Fetches AFL fixture JSON for a team and writes an iCalendar (.ics) file.
// Usage: node src/fetch-and-convert.js [team] [year]

import { createHash } from "crypto";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, "..");

const team = process.argv[2];
const year = process.argv[3] ?? "2026";
if (!team) { console.error("Usage: node src/fetch-and-convert.js <team> [year]"); process.exit(1); }
const SRC  = `https://fixturedownload.com/feed/json/afl-${year}/${team}`;
const OUT  = join(ROOT, "docs", `${team}.ics`);

// ── helpers ────────────────────────────────────────────────────────────────

function uid(f) {
  const key = `${year}-${f.RoundNumber}-${f.HomeTeam}-${f.AwayTeam}`;
  return createHash("sha1").update(key).digest("hex") + `@afl-${year}.ics`;
}

/**
 * fixturedownload DateUtc field looks like "2026-03-14T13:15:00Z"
 * Fall back to other field names just in case.
 */
function getDateStr(f) {
  return f.DateUtc ?? f.DateUTC ?? f.Date ?? f.MatchTime ?? f.DateTime ?? null;
}

/**
 * Parse date string → UTC milliseconds.
 * Handles:
 *   ISO:        "2026-03-14T13:15:00Z"  or  "2026-03-14T13:15:00+11:00"
 *   DD/MM/YYYY: "14/03/2026 13:15"  (treated as UTC per fixturedownload docs)
 */
function parseToMs(str) {
  if (!str) return null;
  str = str.trim();

  // ISO format — normalize space separator to T before parsing
  if (/^\d{4}-\d{2}-\d{2}[ T]/.test(str)) {
    const ms = Date.parse(str.replace(" ", "T"));
    return isNaN(ms) ? null : ms;
  }

  // DD/MM/YYYY HH:MM  — fixturedownload serves UTC times in this format too
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (m) {
    const [, d, mo, y, hh, mm] = m.map(Number);
    return Date.UTC(y, mo - 1, d, hh, mm);
  }

  return null;
}

/** Format ms timestamp as iCal UTC string e.g. 20260314T131500Z */
function toUtcStamp(ms) {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

function nowUtc() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

/** RFC 5545 line folding at 75 octets */
function fold(line) {
  const out = [];
  while (line.length > 75) { out.push(line.slice(0, 75)); line = " " + line.slice(75); }
  out.push(line);
  return out.join("\r\n");
}

function esc(v) {
  return String(v ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// ── fetch ──────────────────────────────────────────────────────────────────

async function fetchFixtures() {
  const res = await fetch(SRC, {
    headers: { "User-Agent": "afl-ical-bot/1.0 (+https://github.com)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${SRC}`);
  return res.json();
}

// ── build ICS ──────────────────────────────────────────────────────────────

function buildIcs(fixtures) {
  const dtstamp = nowUtc();
  const MATCH_DURATION_MS = 150 * 60_000; // 2 h 30 min

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//afl-ical-bot//AFL ${year} ${team}//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:AFL ${year} – ${team.charAt(0).toUpperCase() + team.slice(1)}`),
    "X-WR-TIMEZONE:UTC",
  ];

  let skipped = 0;
  for (const f of fixtures) {
    const startMs = parseToMs(getDateStr(f));
    if (startMs === null) { skipped++; continue; }

    const endMs  = startMs + MATCH_DURATION_MS;
    const home   = esc(f.HomeTeam ?? "");
    const away   = esc(f.AwayTeam ?? "");
    const venue  = esc(f.Location ?? f.Venue ?? "");
    const round  = f.RoundNumber != null ? `Round ${f.RoundNumber}` : (f.RoundLabel ?? "");
    const result = f.HomeTeamScore != null ? ` (${f.HomeTeamScore}–${f.AwayTeamScore})` : "";

    lines.push(
      "BEGIN:VEVENT",
      fold(`UID:${uid(f)}`),
      fold(`DTSTAMP:${dtstamp}`),
      fold(`DTSTART:${toUtcStamp(startMs)}`),
      fold(`DTEND:${toUtcStamp(endMs)}`),
      fold(`SUMMARY:${home} v ${away}${result}`),
      fold(`LOCATION:${venue}`),
      fold(`DESCRIPTION:${esc(round)} – ${home} v ${away}${result}`),
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  if (skipped) console.warn(`  ⚠ Skipped ${skipped} fixtures with unparseable dates`);
  return lines.join("\r\n") + "\r\n";
}

// ── main ───────────────────────────────────────────────────────────────────

try {
  console.log(`Fetching ${SRC} …`);
  const fixtures = await fetchFixtures();
  console.log(`  → ${fixtures.length} fixtures received`);

  // Debug: show the raw first fixture so we can verify field names
  if (fixtures.length > 0) {
    console.log("  First fixture sample:", JSON.stringify(fixtures[0], null, 2));
  }

  const ics = buildIcs(fixtures);
  mkdirSync(join(ROOT, "docs"), { recursive: true });
  writeFileSync(OUT, ics, "utf8");
  console.log(`  ✓ Written: ${OUT}`);
} catch (err) {
  console.error("Fatal error:", err.message);
  process.exit(1);
}
