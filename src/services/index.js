const path = require('path');
const { createHttpClient } = require('../core/http');
const { createJsonFileStore } = require('../core/JsonFileStore');
const { createWeatherService } = require('./weather/weatherService');
const { createOpenDotaClient } = require('./dota/openDotaClient');
const { createSteamClient } = require('./dota/steamClient');
const { createDotaService } = require('./dota/dotaService');
const { createDotaAlert } = require('./dota/dotaAlert');
const { createDotaLinks } = require('./dota/dotaLinks');
const { createEpicSource } = require('./freeGames/sources/epic');
const { createSteamSource } = require('./freeGames/sources/steam');
const { createGamerPowerClient } = require('./freeGames/sources/gamerPower');
const { createFreeGamesService } = require('./freeGames/freeGamesService');
const { createFreeGamesStore } = require('./freeGames/freeGamesStore');

/**
 * Единственное место, где конкретные реализации сервисов связываются между собой
 * и с конфигурацией. Остальной код получает готовые сервисы и не знает, откуда они взялись.
 */
function createServices(config) {
  const weather = createWeatherService();

  const dota = createDotaService({
    openDota: createOpenDotaClient(),
    steam: createSteamClient({ apiKey: config.dota.steamApiKey }),
    timezone: config.dota.timezone,
  });
  const dotaAlert = createDotaAlert({ dota });
  const dotaLinks = createDotaLinks(createJsonFileStore(path.join(config.paths.dataDir, 'dota-links.json')));

  const freeGamesHttp = createHttpClient({
    headers: { 'User-Agent': 'kgk44-discord-bot/1.0' },
    timeoutMs: 20_000,
    errorMessage: (url, status) => `${url} -> HTTP ${status}`,
  });
  const { country } = config.freeGames;
  const freeGames = createFreeGamesService({
    sources: [
      createEpicSource({ http: freeGamesHttp, country }),
      createSteamSource({
        http: freeGamesHttp,
        gamerPower: createGamerPowerClient({ http: freeGamesHttp }),
        country,
      }),
    ],
  });
  const freeGamesStore = createFreeGamesStore(
    createJsonFileStore(path.join(config.paths.dataDir, 'free-games.json')),
  );

  return { weather, dota, dotaAlert, dotaLinks, freeGames, freeGamesStore };
}

module.exports = { createServices };
