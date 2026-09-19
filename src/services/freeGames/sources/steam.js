// Steam: собственный поиск и appdetails магазина (скидка 100%, только игры).
// Срок окончания Steam не отдаёт - подтягиваем из GamerPower, если он там есть.

const { normalizeTitle } = require('./gamerPower');

/**
 * Игра считается бесплатной, только если Steam сам показывает скидку ровно 100%.
 * final в price_overview во время раздачи не обнуляется, поэтому смотрим на discount_percent.
 */
function steamGameFromDetails(appId, response, endDates = new Map()) {
  const entry = response?.[appId];
  const data = entry?.success ? entry.data : null;
  if (!data || data.type !== 'game' || data.price_overview?.discount_percent !== 100) return null;

  const endsAt = endDates.get(normalizeTitle(data.name)) ?? null;
  return {
    id: `steam:${appId}`,
    platform: 'steam',
    title: data.name,
    url: `https://store.steampowered.com/app/${appId}/`,
    image: data.header_image ?? null,
    originalPrice: data.price_overview.initial_formatted || null,
    endsAt,
    endsAtSource: endsAt ? 'gamerpower' : null,
  };
}

function createSteamSource({ http, gamerPower, country }) {
  async function fetchGames() {
    // specials=1 + maxprice=free: товары со скидкой 100%; category1=998: только игры (без DLC и софта).
    const search = await http.getJson(
      'https://store.steampowered.com/search/results/?query&start=0&count=50&specials=1&maxprice=free' +
        `&category1=998&json=1&cc=${country}&l=russian`,
    );
    const appIds = [
      ...new Set((search.items ?? []).map((i) => i.logo?.match(/\/apps\/(\d+)\//)?.[1]).filter(Boolean)),
    ];
    if (!appIds.length) return [];

    const [endDates, details] = await Promise.all([
      gamerPower.fetchEndDates(),
      Promise.allSettled(
        appIds.map((id) =>
          http.getJson(
            `https://store.steampowered.com/api/appdetails?appids=${id}&cc=${country.toLowerCase()}&l=russian`,
          ),
        ),
      ),
    ]);

    return details
      .map((result, i) =>
        result.status === 'fulfilled' ? steamGameFromDetails(appIds[i], result.value, endDates) : null,
      )
      .filter(Boolean);
  }

  return { name: 'Steam', fetchGames };
}

module.exports = { createSteamSource, steamGameFromDetails };
