const { createHttpClient } = require('../../core/http');
const { toSteam64 } = require('./accountId');

const DOTA_APP_ID = 570;

const steamHttpError = (url, status) => `Steam вернул статус ${status}`;

/**
 * Реальное время в Dota 2 по данным Steam (то, что показывается в библиотеке Steam).
 * Работает только если задан STEAM_API_KEY и у игрока открыты данные об играх.
 */
function createSteamClient({ apiKey, http = createHttpClient({ errorMessage: steamHttpError }) }) {
  async function getDotaPlaytimeHours(accountId) {
    if (!apiKey) return null;

    const url =
      'https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/' +
      `?key=${encodeURIComponent(apiKey)}&steamid=${toSteam64(accountId)}` +
      `&include_played_free_games=1&appids_filter[0]=${DOTA_APP_ID}`;

    try {
      const data = await http.getJson(url);
      const minutes = data?.response?.games?.[0]?.playtime_forever;
      return typeof minutes === 'number' ? minutes / 60 : null;
    } catch (error) {
      console.error('[steam] не удалось получить время в игре:', error.message);
      return null;
    }
  }

  return { getDotaPlaytimeHours };
}

module.exports = { createSteamClient };
