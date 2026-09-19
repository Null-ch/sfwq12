# kgk44 Discord Bot

Кастомный Discord-бот на discord.js + discord-player:

- 🎵 Музыка по команде в голосовом канале: YouTube (напрямую) и Spotify/SoundCloud/Apple Music (ссылки резолвятся в YouTube-аудио, т.к. сам Spotify не отдаёт потоковое аудио по API — так работают все музыкальные боты).
- 🌤️ Ежедневный прогноз погоды в заданный канал (Open-Meteo, без API-ключа).
- 🎮 Статистика игрока Dota 2 по команде (OpenDota, без API-ключа).

## 1. Требования на сервере

- Node.js 20+ (нужен встроенный `fetch`)
- **ffmpeg** — обязателен для воспроизведения звука
- **yt-dlp** — обязателен для получения аудио с YouTube (это самый живучий инструмент против блокировок YouTube, обновляется чаще всех аналогов)

Если разворачиваешь через Docker (см. ниже) — всё это уже включено в образ, ничего ставить руками не надо.

Для локальной установки без Docker (Windows):

```powershell
winget install Gyan.FFmpeg
pip install -U yt-dlp
```

## 2. Discord-приложение и токен

1. Открой https://discord.com/developers/applications и выбери своё приложение (у тебя уже есть Application ID `1550806087605686352`).
2. Слева зайди в **Bot**. Если бота ещё нет — нажми **Add Bot**.
3. Нажми **Reset Token** и скопируй токен — это и есть `DISCORD_TOKEN` (НЕ Public Key, который ты присылал — он для проверки подписи HTTP-интеракций и тут не используется).
4. Включи **Privileged Gateway Intents**, если понадобятся: для этого бота они не нужны (используются только `Guilds` и `GuildVoiceStates`).
5. Вкладка **OAuth2 → URL Generator**: выбери scope `bot` и `applications.commands`, из permissions отметь минимум `Connect`, `Speak`, `Send Messages`, `Embed Links`, `View Channel`. Скопируй сгенерированную ссылку и открой её, чтобы пригласить бота на сервер.

## 3. Настройка проекта

```bash
npm install
cp .env.example .env
```

Заполни `.env`:

- `DISCORD_TOKEN` — токен из шага выше
- `DISCORD_GUILD_ID` — ID твоего сервера (ПКМ по серверу → Copy Server ID, нужен Developer Mode в настройках Discord). На этапе разработки это даёт мгновенное обновление слэш-команд вместо ожидания до часа при глобальной регистрации.
- `WEATHER_CHANNEL_ID` — ID канала для ежедневного прогноза
- `WEATHER_CITY`, `WEATHER_CRON`, `WEATHER_TIMEZONE` — город/время/таймзона
- `DOTA_DEFAULT_ACCOUNT_ID` — опционально, твой account_id по умолчанию

Зарегистрируй слэш-команды и запусти бота:

```bash
npm run deploy-commands
npm start
```

## 4. Команды

**Музыка**
- `/play query:<название или ссылка>` — играть/добавить в очередь (YouTube, Spotify, SoundCloud)
- `/skip`, `/pause`, `/resume`, `/stop`, `/leave`
- `/queue` — показать очередь
- `/nowplaying` — что играет сейчас
- `/volume level:<0-100>`

**Погода**
- `/weather city:<город>` — прогноз по запросу (город опционален, иначе берётся `WEATHER_CITY`)
- Ежедневный автопост в `WEATHER_CHANNEL_ID` в момент, заданный `WEATHER_CRON`

**Dota 2**
- `/dota link account_id:<id или ссылка>` — привязать свой профиль к своему Discord-аккаунту (один раз)
- `/dota stats member:<@участник>` — статистика участника (если он делал `/dota link`)
- `/dota stats account_id:<id или ссылка>` — статистика по любому account_id напрямую

`account_id` — это **Steam32 ID** (например, из ссылки `opendota.com/players/123456789` или `dotabuff.com/players/123456789`), а не SteamID64 и не ссылка на профиль Steam. SteamID64 бот тоже понимает и сам сконвертирует.

## 5. Деплой на VPS (Docker)

```bash
docker compose up -d --build
docker compose logs -f
```

Данные (привязки Dota-профилей) сохраняются в `./data` на хосте через volume.

### Обновление yt-dlp

YouTube регулярно меняет защиту от скрапинга, и yt-dlp обновляется в ответ на это чаще, чем любая JS-библиотека. Если музыка с YouTube вдруг перестала играть — в 95% случаев помогает обновление yt-dlp:

```bash
docker compose exec bot pip3 install -U yt-dlp
docker compose restart bot
```

Без Docker: `pip install -U yt-dlp`.

## 6. Известные ограничения

- **Яндекс.Музыка** не поддерживается: официального публичного API для стриминга нет, только неофициальные обёртки, требующие логина реальным аккаунтом и умирающие после каждого обновления Яндекс.Музыки. Можно добавить отдельным экстрактором позже, если действительно понадобится, но стабильность будет ниже, чем у YouTube/Spotify.
- Прямые ссылки на YouTube-плейлисты ограничены первыми 100 треками (защита от случайного добавления гигантских плейлистов).
- `/dota stats` использует публичные данные OpenDota — если у игрока в настройках Dota 2 выключена статистика ("Expose Public Match Data"), часть полей (MMR и т.п.) будет недоступна.
