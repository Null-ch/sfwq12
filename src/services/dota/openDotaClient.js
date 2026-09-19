// OpenDota API: бесплатный, без ключа для базовых запросов.
// https://docs.opendota.com/

const { createHttpClient } = require('../../core/http');

const OPEN_DOTA_BASE = 'https://api.opendota.com/api';

const openDotaHttpError = (url, status) =>
  status === 404
    ? 'Игрок не найден. Проверь account_id (числовой Dota/Steam32 ID, не SteamID64 и не ссылку).'
    : `OpenDota вернул статус ${status}`;

/** Только транспорт: адреса и форма запросов. Логики подсчёта здесь нет. */
function createOpenDotaClient({ http = createHttpClient({ errorMessage: openDotaHttpError }) } = {}) {
  const player = (accountId, resource = '') => `${OPEN_DOTA_BASE}/players/${accountId}${resource}`;

  return {
    getProfile: (accountId) => http.getJson(player(accountId)),
    getWinLoss: (accountId) => http.getJson(player(accountId, '/wl')),
    getRecentMatches: (accountId) => http.getJson(player(accountId, '/recentMatches')),
    getTotals: (accountId) => http.getJson(player(accountId, '/totals')),
    getHeroes: () => http.getJson(`${OPEN_DOTA_BASE}/heroes`),
    /** Просит OpenDota подтянуть свежие матчи. Ответ не важен - это best effort. */
    refresh: (accountId) => http.request(player(accountId, '/refresh'), { method: 'POST' }).catch(() => {}),
  };
}

module.exports = { createOpenDotaClient };
