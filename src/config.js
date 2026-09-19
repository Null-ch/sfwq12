require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Отсутствует обязательная переменная окружения ${name}. Проверь .env (см. .env.example).`);
  }
  return value;
}

module.exports = {
  discord: {
    token: required('DISCORD_TOKEN'),
    clientId: required('DISCORD_CLIENT_ID'),
    guildId: process.env.DISCORD_GUILD_ID || null,
  },
  ytdlp: {
    binaryPath: process.env.YTDLP_PATH || 'yt-dlp',
    cookiesPath: process.env.YTDLP_COOKIES || null,
  },
  ffmpeg: {
    binaryPath: process.env.FFMPEG_PATH || 'ffmpeg',
  },
  weather: {
    channelId: process.env.WEATHER_CHANNEL_ID || null,
    // WEATHER_CITIES - список городов через запятую (новый формат).
    // WEATHER_CITY - старый формат с одним городом, оставлен для совместимости.
    cities: (process.env.WEATHER_CITIES || process.env.WEATHER_CITY || 'Moscow')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean),
    cron: process.env.WEATHER_CRON || '0 8 * * *',
    timezone: process.env.WEATHER_TIMEZONE || 'Europe/Moscow',
  },
  dota: {
    defaultAccountId: process.env.DOTA_DEFAULT_ACCOUNT_ID || null,
  },
};
