// Epic: официальный JSON магазина (https://store.epicgames.com/free-games).

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

function createEpicSource({ http, country }) {
  return {
    name: 'Epic',
    async fetchGames() {
      const data = await http.getJson(
        `https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=ru&country=${country}&allowCountries=${country}`,
      );
      return parseEpic(data);
    },
  };
}

module.exports = { createEpicSource, parseEpic };
