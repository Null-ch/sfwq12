function isWin(match) {
  return (match.player_slot < 128) === Boolean(match.radiant_win);
}

// Дата в формате YYYY-MM-DD в нужной таймзоне (en-CA даёт именно такой формат).
function localDay(date, timeZone) {
  return date.toLocaleDateString('en-CA', { timeZone });
}

/**
 * Матчи за сегодняшний календарный день в заданной таймзоне.
 * recentMatches у OpenDota - последние 20 матчей, для "сегодня" этого достаточно.
 */
function summarizeToday(recentMatches, timeZone, now = new Date()) {
  const today = localDay(now, timeZone);
  const matches = (recentMatches || []).filter(
    (m) => localDay(new Date(m.start_time * 1000), timeZone) === today,
  );

  const wins = matches.filter(isWin).length;
  return {
    matches: matches.length,
    wins,
    losses: matches.length - wins,
    minutes: Math.round(matches.reduce((sum, m) => sum + m.duration, 0) / 60),
  };
}

module.exports = { isWin, summarizeToday };
