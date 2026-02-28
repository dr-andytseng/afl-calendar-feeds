/*
Usage: node src/fetch-and-convert.js <team>
Example: node src/fetch-and-convert.js melbourne
Outputs: docs/<team>.ics
*/
import fs from "fs";
import path from "path";
import crypto from "crypto";
import fetch from "node-fetch";
import ical from "ical-generator";

if (process.argv.length < 3) {
  console.error("Usage: node src/fetch-and-convert.js <team>");
  process.exit(1);
}

const team = process.argv[2];
const outDir = "docs";
const outFile = path.join(outDir, `${team}.ics`);
const jsonUrl = `https://fixturedownload.com/feed/json/afl-2026/${team}`;

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "afl-calendar-feeds/1.0" } });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${res.statusText}`);
  return res.json();
}

function stableUid(eventId, team) {
  return crypto.createHash("sha1").update(`${team}:${eventId}`).digest("hex") + "@fixturedownload";
}

function toDate(d) {
  return d ? new Date(d) : null;
}

function ensureOutDir() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
}

async function build() {
  console.log(`Fetching JSON for ${team}...`);
  let data;
  try {
    data = await fetchJson(jsonUrl);
  } catch (e) {
    console.error("Error fetching JSON:", e.message);
    process.exit(2);
  }

  const events = data?.fixtures || data?.events || data;
  if (!Array.isArray(events)) {
    console.error("Unexpected JSON shape — expected an array of events.");
    process.exit(3);
  }

  const cal = ical({ name: `AFL 2026 — ${team}`, prodId: { company: "afl-calendar-feeds", product: team } });

  for (const ev of events) {
    const sourceId = ev.id || ev.event_id || ev.fixture_id || ev.match_id || (ev.url ? ev.url : JSON.stringify(ev.start));
    const uid = stableUid(sourceId, team);

    const start = toDate(ev.start || ev.date || ev.kickoff || ev.utc || ev.start_date_time);
    let end = toDate(ev.end || ev.finish || ev.kickoff_end);
    if (!end && start) {
      end = new Date(start.getTime() + 2.5 * 60 * 60 * 1000);
    }

    const summary = ev.title || ev.name || ev.match || `${ev.home || ""} vs ${ev.away || ""}`.trim() || "AFL Match";
    const description = ev.description || ev.notes || ev.summary || "";
    const location = ev.venue || ev.location || ev.stadium || ev.ground || "";

    const vevent = cal.createEvent({
      id: uid,
      uid,
      start: start || new Date(),
      end: end || new Date((start || new Date()).getTime() + 2.5 * 60 * 60 * 1000),
      summary,
      description,
      location,
      stamp: new Date()
    });

    if (ev.url) vevent.url(ev.url);
    if (ev.home && ev.away) vevent.description(`${description}\n\n${ev.home} vs ${ev.away}`);
  }

  ensureOutDir();
  const ics = cal.toString();

  let prev = null;
  if (fs.existsSync(outFile)) prev = fs.readFileSync(outFile, "utf8");
  if (prev === ics) {
    console.log("No changes detected; leaving file unchanged.");
    return 0;
  }
  fs.writeFileSync(outFile, ics, "utf8");
  console.log(`Wrote ${outFile} (${cal.events().length} events)`);
  return 0;
}

build().catch((err) => {
  console.error(err);
  process.exit(4);
});
