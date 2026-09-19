const { normalizeAccountId } = require('./accountId');
const { describeRank } = require('./rank');
const { isWin, summarizeToday } = require('./matches');

const DEFAULT_REFRESH_WAIT_MS = 15_000;

/**
 * Собирает сводки по игроку из данных OpenDota и Steam.
 * Зависимости (клиенты API, таймзона, часы, sleep) приходят снаружи, поэтому сервис
 * проверяется на подставных данных, без сети.
 */
function createDotaService({
  openDota,
  steam,
  timezone,
  now = () => new Date(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  let heroNames = null;

  async function getHeroName(heroId) {
    if (!heroNames) {
      try {
        const heroes = await openDota.getHeroes();
        heroNames = new Map(heroes.map((h) => [h.id, h.localized_name]));
      } catch {
        // Не кешируем сбой: следующий запрос попробует загрузить список заново.
        return `Герой #${heroId}`;
      }
    }
    return heroNames.get(heroId) || `Герой #${heroId}`;
  }

  /**
   * Суммарное время в играх по данным OpenDota (сумма длительностей всех матчей).
   * Считает только матчи, которые видит OpenDota, - т.е. без лобби, меню и
   * матчей, сыгранных до включения "Expose Public Match Data".
   */
  async function getTotalMatchHours(accountId) {
    const totals = await openDota.getTotals(accountId).catch(() => []);
    const duration = totals.find((t) => t.field === 'duration');
    return duration ? duration.sum / 3600 : null;
  }

  /**
   * Просит OpenDota подтянуть свежие матчи игрока. Без этого последние матчи
   * могут появиться с задержкой.
   */
  async function requestRefresh(accountIdInput) {
    await openDota.refresh(normalizeAccountId(accountIdInput));
  }

  /** Обновляет данные игрока и даёт OpenDota время их обработать. */
  async function refreshAndWait(accountIdInput, waitMs = DEFAULT_REFRESH_WAIT_MS) {
    await requestRefresh(accountIdInput);
    await sleep(waitMs);
  }

  /**
   * Только "сегодня" - два лёгких запроса вместо полной сводки.
   * hasData=false, если у OpenDota нет матчей игрока (скрытый профиль / неверный id):
   * тогда "0 минут" ничего не значит и пинговать по нему нельзя.
   */
  async function getTodayStats(accountIdInput) {
    const accountId = normalizeAccountId(accountIdInput);
    const [wl, recentMatches] = await Promise.all([
      openDota.getWinLoss(accountId),
      openDota.getRecentMatches(accountId),
    ]);

    return {
      accountId,
      hasData: (wl.win || 0) + (wl.lose || 0) > 0,
      today: summarizeToday(recentMatches, timezone, now()),
    };
  }

  async function getPlayerSummary(accountIdInput) {
    const accountId = normalizeAccountId(accountIdInput);

    const [profile, wl, recentMatches, totalMatchHours, steamHours] = await Promise.all([
      openDota.getProfile(accountId),
      openDota.getWinLoss(accountId),
      openDota.getRecentMatches(accountId),
      getTotalMatchHours(accountId),
      steam.getDotaPlaytimeHours(accountId),
    ]);

    const lastMatch = recentMatches?.[0] || null;
    const totalGames = (wl.win || 0) + (wl.lose || 0);
    const winrate = totalGames ? ((wl.win / totalGames) * 100).toFixed(1) : '0.0';

    return {
      accountId,
      nickname: profile.profile?.personaname || 'Неизвестный игрок',
      avatar: profile.profile?.avatarfull,
      profileUrl: profile.profile?.profileurl,
      countryCode: profile.profile?.loccountrycode,
      rank: describeRank(profile.rank_tier),
      mmrEstimate: profile.mmr_estimate?.estimate ?? null,
      wins: wl.win || 0,
      losses: wl.lose || 0,
      winrate,
      totalMatchHours,
      steamHours,
      today: summarizeToday(recentMatches, timezone, now()),
      lastMatch: lastMatch && {
        matchId: lastMatch.match_id,
        heroId: lastMatch.hero_id,
        heroName: await getHeroName(lastMatch.hero_id),
        kills: lastMatch.kills,
        deaths: lastMatch.deaths,
        assists: lastMatch.assists,
        won: isWin(lastMatch),
        durationMinutes: Math.round(lastMatch.duration / 60),
        startTime: new Date(lastMatch.start_time * 1000),
        endTime: new Date((lastMatch.start_time + lastMatch.duration) * 1000),
      },
    };
  }

  return { getPlayerSummary, getTodayStats, requestRefresh, refreshAndWait };
}

module.exports = { createDotaService };
