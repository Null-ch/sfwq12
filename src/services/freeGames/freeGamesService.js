// Бесплатные раздачи игр: только то, что реально стоит 0 (скидка 100%).
// Источники подключаются списком: чтобы добавить магазин, достаточно передать
// ещё один объект { name, fetchGames() } - сам сервис менять не нужно.

function createFreeGamesService({ sources }) {
  /** Источники независимо: сбой одного не должен скрывать раздачи из другого. */
  async function fetchAllFreeGames() {
    const results = await Promise.allSettled(sources.map((source) => source.fetchGames()));

    const games = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') games.push(...result.value);
      else console.error(`[free-games] не удалось получить раздачи ${sources[i].name}:`, result.reason.message);
    });
    return games;
  }

  return { fetchAllFreeGames };
}

module.exports = { createFreeGamesService };
