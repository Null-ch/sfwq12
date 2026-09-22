const path = require('path');
const { parseList } = require('./core/text');

/**
 * Собирает конфигурацию из переменных окружения. Чистая функция: не читает .env
 * сама (это делают точки входа) и не падает при отсутствии токена - обязательные
 * значения проверяет assertRequiredConfig, чтобы конфиг можно было собрать в тестах.
 */
function loadConfig(env = process.env, { rootDir = path.join(__dirname, '..') } = {}) {
  return {
    discord: {
      token: env.DISCORD_TOKEN || null,
      clientId: env.DISCORD_CLIENT_ID || null,
      guildId: env.DISCORD_GUILD_ID || null,
    },
    paths: {
      // Где лежат JSON-файлы состояния (привязки Dota-профилей, опубликованные раздачи).
      dataDir: env.DATA_DIR || path.join(rootDir, 'data'),
    },
    ytdlp: {
      binaryPath: env.YTDLP_PATH || 'yt-dlp',
      cookiesPath: env.YTDLP_COOKIES || null,
    },
    ffmpeg: {
      binaryPath: env.FFMPEG_PATH || 'ffmpeg',
    },
    notify: {
      // Единый канал для всех ежедневных уведомлений (погода, статистика и напоминание о Dota).
      // WEATHER_CHANNEL_ID - старое имя переменной, оставлено, чтобы уже настроенный .env не сломался.
      channelId: env.NOTIFY_CHANNEL_ID || env.WEATHER_CHANNEL_ID || null,
    },
    freeGames: {
      // Как часто проверять раздачи (Epic меняет их раз в неделю, Steam - когда придётся).
      cron: env.FREEGAMES_CRON || '0 */2 * * *',
      // Регион для Epic (влияет на цены и доступность), двухбуквенный код страны.
      country: (env.FREEGAMES_COUNTRY || 'RU').toUpperCase(),
    },
    music: {
      // Через сколько после конца очереди / когда в канале не осталось людей бот выходит из канала.
      leaveDelayMs: Number(env.MUSIC_LEAVE_DELAY_SECONDS ?? 30) * 1000,
    },
    weather: {
      // WEATHER_CITIES - список городов через запятую (новый формат).
      // WEATHER_CITY - старый формат с одним городом, оставлен для совместимости.
      cities: parseList(env.WEATHER_CITIES || env.WEATHER_CITY || 'Moscow'),
      cron: env.WEATHER_CRON || '0 8 * * *',
      timezone: env.WEATHER_TIMEZONE || 'Europe/Moscow',
    },
    offlineAlert: {
      // Discord ID пользователей через запятую, за чьим отсутствием в сети следит бот.
      userIds: parseList(env.OFFLINE_ALERT_USER_IDS),
      // С какого числа полных дней без появления в сети начинать писать в канал.
      minDays: Number(env.OFFLINE_ALERT_MIN_DAYS ?? 1),
      cron: env.OFFLINE_ALERT_CRON || '0 12 * * *',
      timezone: env.OFFLINE_ALERT_TIMEZONE || env.WEATHER_TIMEZONE || 'Europe/Moscow',
    },
    minecraft: {
      // Базовый URL и токен link-server из репозитория minecraft-server (сервис link-server
      // в его docker-compose.yml): бессрочные ссылки на свежий бэкап (/latest) и клиент-пак (/client).
      linkBaseUrl: env.MINECRAFT_LINK_BASE_URL || null,
      linkToken: env.MINECRAFT_LINK_TOKEN || null,
      // Опционально: если задан, /minecraft работает только в этом канале.
      channelId: env.MINECRAFT_CHANNEL_ID || null,
      // Клиент-пак прикладывается файлом к ответу, только если он не больше этого размера
      // (иначе просто ссылка) - лимит вложений Discord у небустнутых серверов начинается от 10 МБ.
      clientAttachMaxBytes: Number(env.MINECRAFT_CLIENT_ATTACH_MAX_MB ?? 8) * 1024 * 1024,
    },
    dota: {
      defaultAccountId: env.DOTA_DEFAULT_ACCOUNT_ID || null,
      cron: env.DOTA_CRON || '0 23 * * *',
      timezone: env.DOTA_TIMEZONE || env.WEATHER_TIMEZONE || 'Europe/Moscow',
      steamApiKey: env.STEAM_API_KEY || null,
      // Напоминание "пора играть": пинг, если за сегодня сыграно меньше minHours часов.
      alert: {
        userId: env.DOTA_ALERT_USER_ID || null,
        accountId: env.DOTA_ALERT_ACCOUNT_ID || env.DOTA_DEFAULT_ACCOUNT_ID || null,
        minHours: Number(env.DOTA_ALERT_MIN_HOURS ?? 2),
        cron: env.DOTA_ALERT_CRON || '0 13 * * *',
      },
    },
  };
}

function assertRequiredConfig(config) {
  const required = [
    ['DISCORD_TOKEN', config.discord.token],
    ['DISCORD_CLIENT_ID', config.discord.clientId],
  ];
  for (const [name, value] of required) {
    if (!value) {
      throw new Error(`Отсутствует обязательная переменная окружения ${name}. Проверь .env (см. .env.example).`);
    }
  }
  return config;
}

module.exports = { loadConfig, assertRequiredConfig };
