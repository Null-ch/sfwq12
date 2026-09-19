// Бесплатные раздачи игр: только то, что реально стоит 0 (скидка 100%).
// Epic: официальный JSON магазина (https://store.epicgames.com/free-games).
// Steam: собственный поиск и appdetails магазина Steam (скидка 100%, только игры).
//        Срок окончания Steam не отдаёт - подтягиваем из GamerPower.com, если он там есть.

const config = require('../config');

const HEADERS = { 'User-Agent': 'kgk44-discord-bot/1.0' };

async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

/**
 * Epic отдаёт и раздачи, и обычные скидки: в "бесплатной" акции цена со скидкой равна 0,
 * а сама акция уже началась и ещё не закончилась (будущие раздачи пропускаем).
 */
function parseEpic(data, now = new Date()) {
  const elements = data?.data?.Catalog?.searchStore?.elements ?? [];
  const games = [];

  for (const e of elements) {
    if (e.price?.totalPrice?.discountPrice !== 0) continue;

    const offer = e.promotions?.promotionalOffers?.[0]?.promotionalOffers?.find(
      (o) =>
        o.discountSetting?.discountPercentage === 0 &&
        new Date(o.startDate) <= now &&
        now < new Date(o.endDate),
    );
    if (!offer) continue;

    const slug =
      e.offerMappings?.[0]?.pageSlug || e.catalogNs?.mappings?.[0]?.pageSlug || e.productSlug || e.urlSlug;
    const image =
      e.keyImages?.find((i) => i.type === 'OfferImageWide') ||
      e.keyImages?.find((i) => i.type === 'Thumbnail') ||
      e.keyImages?.[0];

    games.push({
      id: `epic:${e.id}:${offer.endDate}`,
      platform: 'epic',
      title: e.title,
      url: slug
        ? `https://store.epicgames.com/ru/p/${slug.replace(/\/home$/, '')}`
        : 'https://store.epicgames.com/ru/free-games',
      image: image?.url ?? null,
      originalPrice: e.price?.totalPrice?.fmtPrice?.originalPrice ?? null,
      endsAt: new Date(offer.endDate),
    });
  }
  return games;
}

async function fetchEpicFreeGames() {
  const country = config.freeGames.country;
  const data = await fetchJson(
    `https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=ru&country=${country}&allowCountries=${country}`,
  );
  return parseEpic(data);
}

const normalizeTitle = (title) => title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** Карта "название -> дата окончания" из GamerPower. Только для срока, наличие раздачи оно не определяет. */
async function fetchSteamEndDates() {
  try {
    const list = await fetchJson('https://www.gamerpower.com/api/giveaways?platform=steam&type=game');
    const dates = new Map();
    for (const g of Array.isArray(list) ? list : []) {
      if (!/^\d{4}-\d{2}-\d{2} /.test(g.end_date ?? '')) continue; // "N/A" - без срока
      const title = g.title.replace(/\s*\(Steam\)\s*(Key\s*)?Giveaway\s*$/i, '');
      // GamerPower отдаёт "YYYY-MM-DD HH:mm:ss" в UTC.
      dates.set(normalizeTitle(title), new Date(g.end_date.replace(' ', 'T') + 'Z'));
    }
    return dates;
  } catch (error) {
    console.error('[free-games] не удалось получить сроки раздач Steam:', error.message);
    return new Map();
  }
}

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

async function fetchSteamFreeGames() {
  const country = config.freeGames.country;

  // specials=1 + maxprice=free: товары со скидкой 100%; category1=998: только игры (без DLC и софта).
  const search = await fetchJson(
    'https://store.steampowered.com/search/results/?query&start=0&count=50&specials=1&maxprice=free' +
      `&category1=998&json=1&cc=${country}&l=russian`,
  );
  const appIds = [
    ...new Set((search.items ?? []).map((i) => i.logo?.match(/\/apps\/(\d+)\//)?.[1]).filter(Boolean)),
  ];
  if (!appIds.length) return [];

  const [endDates, details] = await Promise.all([
    fetchSteamEndDates(),
    Promise.allSettled(
      appIds.map((id) =>
        fetchJson(`https://store.steampowered.com/api/appdetails?appids=${id}&cc=${country.toLowerCase()}&l=russian`),
      ),
    ),
  ]);

  return details
    .map((result, i) => (result.status === 'fulfilled' ? steamGameFromDetails(appIds[i], result.value, endDates) : null))
    .filter(Boolean);
}

/** Оба источника независимо: сбой одного не должен скрывать раздачи из другого. */
async function fetchAllFreeGames() {
  const sources = [
    ['Epic', fetchEpicFreeGames],
    ['Steam', fetchSteamFreeGames],
  ];
  const results = await Promise.allSettled(sources.map(([, fn]) => fn()));

  const games = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') games.push(...result.value);
    else console.error(`[free-games] не удалось получить раздачи ${sources[i][0]}:`, result.reason.message);
  });
  return games;
}

module.exports = { fetchAllFreeGames, parseEpic, steamGameFromDetails };
