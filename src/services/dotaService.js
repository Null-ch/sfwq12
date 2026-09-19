// OpenDota API: бесплатный, без ключа для базовых запросов.
// https://docs.opendota.com/

const OPEN_DOTA_BASE = 'https://api.opendota.com/api';

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
    const num = Number(raw);
    // SteamID64 -> account_id (Steam32)
    if (num > 76561197960265728) {
      return num - 76561197960265728;
    }
    return num;
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

async function getPlayerSummary(accountIdInput) {
  const accountId = normalizeAccountId(accountIdInput);

  const [profile, wl, recentMatches] = await Promise.all([
    fetchJson(`${OPEN_DOTA_BASE}/players/${accountId}`),
    fetchJson(`${OPEN_DOTA_BASE}/players/${accountId}/wl`),
    fetchJson(`${OPEN_DOTA_BASE}/players/${accountId}/recentMatches`),
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
    lastMatch: lastMatch && {
      matchId: lastMatch.match_id,
      heroId: lastMatch.hero_id,
      heroName: await getHeroName(lastMatch.hero_id),
      kills: lastMatch.kills,
      deaths: lastMatch.deaths,
      assists: lastMatch.assists,
      won:
        (lastMatch.player_slot < 128 && lastMatch.radiant_win) ||
        (lastMatch.player_slot >= 128 && !lastMatch.radiant_win),
      durationMinutes: Math.round(lastMatch.duration / 60),
      startTime: new Date(lastMatch.start_time * 1000),
    },
  };
}

module.exports = { getPlayerSummary, normalizeAccountId };
