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
  music: {
    // Через сколько после конца очереди / когда в канале не осталось людей бот выходит из канала.
    leaveDelayMs: Number(process.env.MUSIC_LEAVE_DELAY_SECONDS ?? 30) * 1000,
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
    // Канал для ежедневной статистики; если не задан - используется канал погоды.
    channelId: process.env.DOTA_CHANNEL_ID || process.env.WEATHER_CHANNEL_ID || null,
    cron: process.env.DOTA_CRON || '0 23 * * *',
    timezone: process.env.DOTA_TIMEZONE || process.env.WEATHER_TIMEZONE || 'Europe/Moscow',
    steamApiKey: process.env.STEAM_API_KEY || null,
    // Напоминание "пора играть": пинг, если за сегодня сыграно меньше minHours часов.
    alert: {
      userId: process.env.DOTA_ALERT_USER_ID || null,
      accountId: process.env.DOTA_ALERT_ACCOUNT_ID || process.env.DOTA_DEFAULT_ACCOUNT_ID || null,
      minHours: Number(process.env.DOTA_ALERT_MIN_HOURS ?? 2),
      cron: process.env.DOTA_ALERT_CRON || '0 13 * * *',
      channelId:
        process.env.DOTA_ALERT_CHANNEL_ID || process.env.DOTA_CHANNEL_ID || process.env.WEATHER_CHANNEL_ID || null,
    },
  },
};
