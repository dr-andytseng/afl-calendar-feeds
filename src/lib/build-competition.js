// Derive per-club and aggregate calendars from one validated competition dataset.

import { CLUBS } from "../config/clubs.js";
import { renderCalendar } from "./ics.js";

/**
 * Routing rules:
 *  - two unknown participants (finals placeholders): aggregate only
 *  - one known club + one placeholder: aggregate + that club's feed
 *  - two known clubs: aggregate + both club feeds
 * The aggregate contains ALL validated dated fixtures.
 */
export function buildCompetitionOutputs(matches, competition, dtstamp) {
  const outputs = [];
  const duration = competition.estimatedDurationMinutes;

  for (const club of CLUBS) {
    const clubMatches = matches.filter(
      (m) => m.homeClub?.slug === club.slug || m.awayClub?.slug === club.slug,
    );
    outputs.push({
      relativePath: `${competition.outputDir ? competition.outputDir + "/" : ""}${club.slug}.ics`,
      ics: renderCalendar(clubMatches, {
        prodid: competition.teamProdid(club.slug),
        calName: competition.teamCalName(club.displayName),
        dtstamp,
        estimatedDurationMinutes: duration,
      }),
    });
  }

  outputs.push({
    relativePath: `${competition.outputDir ? competition.outputDir + "/" : ""}${competition.aggregateSlug}.ics`,
    ics: renderCalendar(matches, {
      prodid: competition.prodid,
      calName: competition.aggregateCalName,
      dtstamp,
      estimatedDurationMinutes: duration,
    }),
  });

  return outputs;
}
