const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');

const { loadCommands, loadEvents } = require('./core/loader');
const { createServices } = require('./services');
const { YtDlpExtractor } = require('./extractors/YtDlpExtractor');
const { createYtDlp } = require('./extractors/ytdlp');
const { registerPlayerEvents } = require('./music/playerEvents');
const { scheduleJobs } = require('./jobs');

function registerClientEvents(client) {
  for (const event of loadEvents()) {
    if (event.once) client.once(event.name, event.execute);
    else client.on(event.name, event.execute);
  }
}

/**
 * Composition root: единственное место, где собираются клиент, плеер, сервисы, команды
 * и события. Ничего не подключается к Discord, пока не вызван start().
 */
function createApp(config) {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  });

  const services = createServices(config);
  const ctx = { config, services };

  client.commands = new Collection(loadCommands(ctx));
  registerClientEvents(client);

  const player = new Player(client);

  async function start() {
    // Сначала наш YouTube (через yt-dlp), затем встроенные экстракторы
    // (Spotify, SoundCloud, Apple Music, Vimeo, вложения).
    await player.extractors.register(YtDlpExtractor, { ytdlp: createYtDlp(config.ytdlp) });
    await player.extractors.loadMulti(DefaultExtractors);

    registerPlayerEvents(player);
    scheduleJobs(client, ctx);

    await client.login(config.discord.token);
  }

  return { client, player, services, start };
}

module.exports = { createApp };
