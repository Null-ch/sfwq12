// OpenDota API: бесплатный, без ключа для базовых запросов.
// https://docs.opendota.com/

const config = require('../config');

const OPEN_DOTA_BASE = 'https://api.opendota.com/api';
const STEAM64_BASE = 76561197960265728n;

const RANK_TIERS = {
  1: 'Рекрут',
  2: 'Страж',
  3: 'Страж',
  4: 'Часовой',
  5: 'Легенда',
  6: 'Властелин',
  7: 'Архонт',
  8: 'Божество',
  9: 'Титан',
  11: 'Бессмертный',
};

function describeRank(rankTier) {
  if (!rankTier) return 'Нет данных (профиль скрыт или мало матчей)';
  const tier = Math.floor(rankTier / 10);
  const star = rankTier % 10;
  const name = RANK_TIERS[tier] || 'Неизвестно';
  if (tier >= 9) return name; // Immortal без звёзд
  return `${name} ${star}`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (res.status === 404) {
    throw new Error('Игрок не найден. Проверь account_id (числовой Dota/Steam32 ID, не SteamID64 и не ссылку).');
  }
  if (!res.ok) {
    throw new Error(`OpenDota вернул статус ${res.status}`);
  }
  return res.json();
}

/**
 * Извлекает числовой account_id из разных форматов: чистое число,
 * ссылка на профиль OpenDota/Dotabuff/Stratz, или SteamID64.
 */
function normalizeAccountId(input) {
  const raw = String(input).trim();

  const urlMatch = raw.match(/(?:players|id)\/(\d+)/i);
  if (urlMatch) return Number(urlMatch[1]);

  if (/^\d+$/.test(raw)) {
    // SteamID64 не помещается в безопасный диапазон Number (2^53-1),
    // поэтому конвертируем через BigInt, чтобы не терять последние цифры.
    const big = BigInt(raw);
    if (big > STEAM64_BASE) {
      return Number(big - STEAM64_BASE);
    }
    return Number(big);
  }

  throw new Error('Не удалось распознать account_id. Передай число или ссылку на профиль OpenDota/Dotabuff.');
}

let heroCache = null;

async function getHeroName(heroId) {
  if (!heroCache) {
    const heroes = await fetchJson(`${OPEN_DOTA_BASE}/heroes`).catch(() => []);
    heroCache = new Map(heroes.map((h) => [h.id, h.localized_name]));
  }
  return heroCache.get(heroId) || `Герой #${heroId}`;
}


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
function summarizeToday(recentMatches, timeZone) {
  const today = localDay(new Date(), timeZone);
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

/**
 * Суммарное время в играх по данным OpenDota (сумма длительностей всех матчей).
 * Считает только матчи, которые видит OpenDota, - т.е. без лобби, меню и
 * матчей, сыгранных до включения "Expose Public Match Data".
 */
async function getTotalMatchHours(accountId) {
  const totals = await fetchJson(`${OPEN_DOTA_BASE}/players/${accountId}/totals`).catch(() => []);
  const duration = totals.find((t) => t.field === 'duration');
  return duration ? duration.sum / 3600 : null;
}

/**
 * Реальное время в Dota 2 по данным Steam (то, что показывается в библиотеке Steam).
 * Работает только если задан STEAM_API_KEY и у игрока открыты данные об играх.
 */
async function getSteamPlaytimeHours(accountId) {
  if (!config.dota.steamApiKey) return null;

  const steamId = (BigInt(accountId) + STEAM64_BASE).toString();
  const url =
    'https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/' +
    `?key=${encodeURIComponent(config.dota.steamApiKey)}&steamid=${steamId}` +
    '&include_played_free_games=1&appids_filter[0]=570';

  try {
    const data = await fetchJson(url);
    const minutes = data?.response?.games?.[0]?.playtime_forever;
    return typeof minutes === 'number' ? minutes / 60 : null;
  } catch (error) {
    console.error('[steam] не удалось получить время в игре:', error.message);
    return null;
  }
}

/**
 * Просит OpenDota подтянуть свежие матчи игрока. Без этого последние матчи
 * могут появиться с задержкой. Ответ не важен - это best effort.
 */
async function requestRefresh(accountIdInput) {
  const accountId = normalizeAccountId(accountIdInput);
  await fetch(`${OPEN_DOTA_BASE}/players/${accountId}/refresh`, { method: 'POST' }).catch(() => {});
}

/**
 * Только "сегодня" - два лёгких запроса вместо полной сводки.
 * hasData=false, если у OpenDota нет матчей игрока (скрытый профиль / неверный id):
 * тогда "0 минут" ничего не значит и пинговать по нему нельзя.
 */
async function getTodayStats(accountIdInput) {
  const accountId = normalizeAccountId(accountIdInput);
  const [wl, recentMatches] = await Promise.all([
    fetchJson(`${OPEN_DOTA_BASE}/players/${accountId}/wl`),
    fetchJson(`${OPEN_DOTA_BASE}/players/${accountId}/recentMatches`),
  ]);

  return {
    accountId,
    hasData: (wl.win || 0) + (wl.lose || 0) > 0,
    today: summarizeToday(recentMatches, config.dota.timezone),
  };
}

async function getPlayerSummary(accountIdInput) {
  const accountId = normalizeAccountId(accountIdInput);

  const [profile, wl, recentMatches, totalMatchHours, steamHours] = await Promise.all([
    fetchJson(`${OPEN_DOTA_BASE}/players/${accountId}`),
    fetchJson(`${OPEN_DOTA_BASE}/players/${accountId}/wl`),
    fetchJson(`${OPEN_DOTA_BASE}/players/${accountId}/recentMatches`),
    getTotalMatchHours(accountId),
    getSteamPlaytimeHours(accountId),
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
    today: summarizeToday(recentMatches, config.dota.timezone),
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

module.exports = { getPlayerSummary, getTodayStats, normalizeAccountId, requestRefresh, summarizeToday };
