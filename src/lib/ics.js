// iCalendar (RFC 5545) helpers: escaping, UTF-8 byte-aware line folding,
// UTC timestamp formatting, and VCALENDAR rendering.

const CRLF = "\r\n";

/** Escape a text value per RFC 5545 §3.3.11. */
export function escapeText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Fold a content line to at most 75 octets per RFC 5545 §3.1.
 * Continuation lines start with a single space (so ≤74 octets of content).
 * Folding is measured in UTF-8 bytes and never splits a multi-byte character.
 */
export function foldLine(line) {
  const byteLength = (s) => Buffer.byteLength(s, "utf8");
  if (byteLength(line) <= 75) return line;

  const chunks = [];
  let current = "";
  let currentBytes = 0;
  let limit = 75; // first line may use the full 75 octets

  for (const ch of line) {
    const chBytes = byteLength(ch);
    if (currentBytes + chBytes > limit) {
      chunks.push(current);
      current = " " + ch; // continuation line: leading space + ≤74 content octets
      currentBytes = 1 + chBytes;
      limit = 74;
    } else {
      current += ch;
      currentBytes += chBytes;
    }
  }
  chunks.push(current);
  return chunks.join(CRLF);
}

/** Format millisecond timestamp as iCal UTC string, e.g. 20260314T131500Z */
export function toUtcStamp(ms) {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

/** Build one VEVENT. `match` is the normalized, validated fixture record. */
export function renderEvent(match, { dtstamp, estimatedDurationMinutes }) {
  const startMs = match.startMs;
  const endMs = startMs + estimatedDurationMinutes * 60_000;
  const scoreSuffix =
    match.homeScore != null && match.awayScore != null
      ? ` (${match.homeScore}–${match.awayScore})`
      : "";
  const summary = `${match.homeTeam} v ${match.awayTeam}${scoreSuffix}`;
  const round = match.roundNumber != null ? `Round ${match.roundNumber}` : "Round TBC";
  const description = `${round} – ${summary}`;

  return [
    "BEGIN:VEVENT",
    foldLine(`UID:${match.uid}`),
    foldLine(`DTSTAMP:${dtstamp}`),
    foldLine(`DTSTART:${toUtcStamp(startMs)}`),
    foldLine(`DTEND:${toUtcStamp(endMs)}`),
    foldLine(`SUMMARY:${escapeText(summary)}`),
    foldLine(`LOCATION:${escapeText(match.location)}`),
    foldLine(`DESCRIPTION:${escapeText(description)}`),
    "END:VEVENT",
  ].join(CRLF);
}

/** Render a complete VCALENDAR document from normalized matches. */
export function renderCalendar(matches, { prodid, calName, dtstamp, estimatedDurationMinutes }) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodid}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine(`X-WR-CALNAME:${escapeText(calName)}`),
    "X-WR-TIMEZONE:UTC",
  ];
  for (const match of matches) {
    lines.push(renderEvent(match, { dtstamp, estimatedDurationMinutes }));
  }
  lines.push("END:VCALENDAR");
  return lines.join(CRLF) + CRLF;
}
