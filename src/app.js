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
  const trackPresence = config.offlineAlert.userIds.length > 0;

  // GuildPresences - привилегированный интент (включается в Developer Portal), поэтому
  // запрашиваем его, только если задан OFFLINE_ALERT_USER_IDS: иначе бот не залогинится без него.
  const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates];
  if (trackPresence) intents.push(GatewayIntentBits.GuildPresences);

  const client = new Client({ intents });

  const services = createServices(config);
  const ctx = { config, services };

  client.commands = new Collection(loadCommands(ctx));
  registerClientEvents(client);

  if (trackPresence) {
    client.on('presenceUpdate', (_, presence) => services.onlineTracker.handlePresence(presence));
    // Кэш присутствия заполняется при подключении к серверам: сразу фиксируем, кто уже в сети.
    client.once('clientReady', () => services.onlineTracker.syncFromClient(client));
  }

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
