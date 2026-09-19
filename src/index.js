const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');

const config = require('./config');
const { YtDlpExtractor } = require('./extractors/YtDlpExtractor');
const { registerPlayerEvents } = require('./events/playerEvents');
const { scheduleDailyWeather } = require('./jobs/dailyWeather');
const { scheduleDailyDota } = require('./jobs/dailyDota');
const { scheduleDotaAlert } = require('./jobs/dailyDotaAlert');
const { scheduleFreeGames } = require('./jobs/freeGames');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'))) {
  const eventModule = require(path.join(eventsPath, file));
  if (!eventModule.name) continue; // playerEvents.js не является событием клиента
  if (eventModule.once) {
    client.once(eventModule.name, eventModule.execute);
  } else {
    client.on(eventModule.name, eventModule.execute);
  }
}

const player = new Player(client);

(async () => {
  // Сначала наш YouTube (через yt-dlp), затем встроенные экстракторы
  // (Spotify, SoundCloud, Apple Music, Vimeo, вложения).
  await player.extractors.register(YtDlpExtractor, {});
  await player.extractors.loadMulti(DefaultExtractors);

  registerPlayerEvents(client);
  scheduleDailyWeather(client);
  scheduleDailyDota(client);
  scheduleDotaAlert(client);
  scheduleFreeGames(client);

  await client.login(config.discord.token);
})().catch((error) => {
  console.error('Не удалось запустить бота:', error);
  process.exit(1);
});
