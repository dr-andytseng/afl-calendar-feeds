#!/usr/bin/env node
// Fetches AFL fixture JSON for a team and writes an iCalendar (.ics) file.
// Usage: node src/fetch-and-convert.js [team] [year]
//   Defaults: team=melbourne, year=2026

import { createHash } from "crypto";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..");

const team = process.argv[2] ?? "melbourne";
const year = process.argv[3] ?? "2026";
const URL  = `https://fixturedownload.com/feed/json/afl-${year}/${team}`;
const OUT  = join(ROOT, "docs", `${team}.ics`);

// ── helpers ────────────────────────────────────────────────────────────────

function uid(event) {
  const key = `${event.RoundNumber}-${event.HomeTeam}-${event.AwayTeam}-${year}`;
  return createHash("sha1").update(key).digest("hex") + `@afl-${year}.ics`;
}

/** Parse "DD/MM/YYYY HH:MM" (local Melbourne time) → Date */
function parseDate(str) {
  if (!str) return null;
  const [datePart, timePart] = str.trim().split(" ");
  const [d, m, y] = datePart.split("/").map(Number);
  const [hh, mm] = (timePart ?? "00:00").split(":").map(Number);
  // fixturedownload times are AEDT/AEST; use a simple UTC offset heuristic:
  // AEDT (Oct–Apr) = UTC+11, AEST (Apr–Oct) = UTC+10
  // A proper implementation would use a TZ library; here we embed TZID instead.
  return { y, m, d, hh, mm };
}

function fmtLocal({ y, m, d, hh, mm }) {
  const pad = n => String(n).padStart(2, "0");
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
}

function fmtNow() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
}

function fold(line) {
  // RFC 5545: fold lines > 75 octets
  const out = [];
  while (line.length > 75) {
    out.push(line.slice(0, 75));
    line = " " + line.slice(75);
  }
  out.push(line);
  return out.join("\r\n");
}

function esc(str) {
  return String(str ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// ── fetch ──────────────────────────────────────────────────────────────────

async function fetchFixtures() {
  const res = await fetch(URL, {
    headers: { "User-Agent": "afl-ical-bot/1.0 (+https://github.com)" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${URL}`);
  return res.json();
}

// ── build ICS ──────────────────────────────────────────────────────────────

function buildIcs(fixtures) {
  const dtstamp = fmtNow();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//afl-ical-bot//AFL ${year} ${team}//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:AFL ${year} – ${team.charAt(0).toUpperCase() + team.slice(1)}`,
    "X-WR-TIMEZONE:Australia/Melbourne",
  ];

  for (const f of fixtures) {
    const start = parseDate(f.DateUtc ?? f.Date);
    if (!start) continue;

    // Default match duration: 2 h 30 min
    const endDate = new Date(
      Date.UTC(start.y, start.m - 1, start.d, start.hh, start.mm) + 150 * 60_000
    );
    const endObj = {
      y: endDate.getUTCFullYear(), m: endDate.getUTCMonth() + 1,
      d: endDate.getUTCDate(), hh: endDate.getUTCHours(), mm: endDate.getUTCMinutes(),
    };

    const home   = esc(f.HomeTeam);
    const away   = esc(f.AwayTeam);
    const venue  = esc(f.Location ?? f.Venue ?? "");
    const round  = esc(f.RoundNumber != null ? `Round ${f.RoundNumber}` : f.RoundLabel ?? "");
    const result = f.HomeTeamScore != null
      ? ` (${f.HomeTeamScore}–${f.AwayTeamScore})` : "";

    lines.push(
      "BEGIN:VEVENT",
      fold(`UID:${uid(f)}`),
      fold(`DTSTAMP:${dtstamp}Z`),
      fold(`DTSTART;TZID=Australia/Melbourne:${fmtLocal(start)}`),
      fold(`DTEND;TZID=Australia/Melbourne:${fmtLocal(endObj)}`),
      fold(`SUMMARY:${home} v ${away}${result}`),
      fold(`LOCATION:${venue}`),
      fold(`DESCRIPTION:${round} – ${home} v ${away}${result}`),
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

// ── main ───────────────────────────────────────────────────────────────────

try {
  console.log(`Fetching ${URL} …`);
  const fixtures = await fetchFixtures();
  console.log(`  → ${fixtures.length} fixtures`);
  const ics = buildIcs(fixtures);
  mkdirSync(join(ROOT, "docs"), { recursive: true });
  writeFileSync(OUT, ics, "utf8");
  console.log(`Written: ${OUT}`);
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
