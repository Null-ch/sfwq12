# kgk44-discord-bot — индекс проекта

Discord-бот (discord.js 14 + discord-player 7, Node >= 22, CommonJS): музыка (YouTube через yt-dlp, Spotify/SoundCloud → мост на YouTube), погода (Open-Meteo), статистика Dota 2 (OpenDota/Steam), бесплатные раздачи Epic/Steam. Язык интерфейса и комментариев — русский. Подробности для пользователя — в [README.md](README.md).

## Команды

- `npm start` — запуск бота (`src/index.js`); `npm run deploy-commands` — регистрация слэш-команд.
- Тестов и линтера в проекте нет (владелец их не хочет — не добавлять). Проверка изменений: загрузить модули (`node -e "require('./src/app')"`), при необходимости прогнать команды с подставными `fetch`/interaction.
- Локально Node 20 может быть старше требуемого (22) — не использовать API, которых нет в 20, без необходимости.

## Архитектура

Composition root — [src/app.js](src/app.js) (`createApp(config).start()`); сервисы собираются в [src/services/index.js](src/services/index.js). Зависимости передаются параметрами, модули не читают `process.env` (кроме `config.js`) и не тянут глобальные синглтоны своих сервисов.

| Путь | Роль |
|---|---|
| `src/index.js`, `src/deploy-commands.js` | точки входа; `dotenv` подключается только здесь |
| `src/config.js` | `loadConfig(env)` (чистая) + `assertRequiredConfig` (токен/clientId) |
| `src/core/` | `http.js` (`createHttpClient`, `HttpError`), `JsonFileStore.js`, `loader.js` (`loadCommands`/`loadEvents`), `text.js`, `theme.js` (цвета/футеры эмбедов), `discordTime.js`, `ephemeral.js` |
| `src/commands/` | по файлу на слэш-команду; экспорт — фабрика `(ctx) => ({ data, execute })`, `ctx = { config, services }` |
| `src/events/` | события клиента: `{ name, once?, execute }` (`interactionCreate`, `ready`) |
| `src/music/` | `ui.js` (кнопки, эмбед очереди), `buttons.js` (`CONTROL_ACTIONS`), `queueCommand.js` (шаблон команд очереди), `playerEvents.js` (события discord-player) |
| `src/extractors/` | `ytdlp.js` (процессы yt-dlp), `YtDlpExtractor.js` (логика; получает `options.ytdlp`) |
| `src/services/weather/` | сервис, коды погоды, эмбеды |
| `src/services/dota/` | `openDotaClient`, `steamClient` (транспорт); `accountId`, `rank`, `matches`, `format` (чистая логика); `dotaService`, `dotaAlert`, `dotaAlertMessages`, `dotaEmbed`, `dotaLinks` |
| `src/services/freeGames/` | `sources/{epic,steam,gamerPower}.js`, `freeGamesService` (список источников), `freeGamesStore`, `freeGamesEmbed` |
| `src/services/presence/` | `onlineTracker` (кто с какого момента офлайн, состояние в `offline-since.json`), `offlineMessages` |
| `src/services/minecraft/` | `minecraftLinkService` (HTTP-клиент к `link-server` из репозитория `minecraft-server`: бессрочные `/latest` бэкап и `/client` клиент-пак по токену), `minecraftEmbed`, `format` (байты) |
| `src/jobs/` | `scheduler.js` (`registerJob`), `index.js` (список задач), по файлу на задачу — фабрика, возвращающая описание `{ name, disabledReason, cron, timezone, run, ... }` |

## Как расширять

- **Команда:** новый файл в `src/commands/` с фабрикой (для команд очереди — `createQueueCommand`). Регистрация автоматическая; после изменения `data` нужен `deploy-commands`.
- **Источник раздач:** объект `{ name, fetchGames() }` в списке `sources` в `services/index.js`.
- **Фоновая задача:** фабрика в `src/jobs/` + строка в `JOB_FACTORIES` (`jobs/index.js`).
- **Кнопки:** модуль `{ matches, handle, errorLabel }` в `buttonHandlers` (`events/interactionCreate.js`).
- **Переменная окружения:** добавить в `loadConfig`, в `.env.example` и в раздел 3 README.

## Конвенции

- CommonJS, 2 пробела, одинарные кавычки, `;`, комментарии на русском и только там, где объясняют «почему».
- Пользовательские тексты (ответы, ошибки, логи) — русские и часто попадают в UI: при рефакторинге не менять их дословно (футеры «АХУЕННЫЙ ВИДЖЕТ …» — намеренные).
- Ошибки внешних API отдаёт сервис через `errorMessage` своего `createHttpClient`; пользователь видит `error.message`.
- Состояние хранится в JSON в `data/` (`DATA_DIR`): `dota-links.json`, `free-games.json`, `offline-since.json` (в git не попадает).
- Интент `GuildPresences` (привилегированный) запрашивается в `app.js` только при непустом `OFFLINE_ALERT_USER_IDS`.

## Особенности

- Скрытые ответы — через `EPHEMERAL` из `src/core/ephemeral.js` (`flags: MessageFlags.Ephemeral`), не через устаревший `ephemeral: true`. Только для `reply`: у `editReply` видимость менять нельзя.
- Деплой: Docker (`docker-compose.yml`), `docker-entrypoint.sh` сначала регистрирует команды, потом стартует бота; yt-dlp обновляется через pip внутри контейнера.
