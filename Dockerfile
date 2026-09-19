# Собираем зависимости в отдельном стейдже со сборочными инструментами:
# @discordjs/opus - нативный C++ addon, готового бинарника под glibc 2.36
# (Debian bookworm) нет, поэтому npm компилирует его сам через node-gyp
# (нужны make/g++/python3). Bullseye не берём: он уже вне поддержки, и его
# security-репозиторий переехал в архив, apt install там сейчас падает 404.
#
# Node 22, а не 20: yt-dlp для YouTube требует внешний JS-рантайм, и для Node
# минимальная поддерживаемая версия - 22.
FROM node:22-bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# Финальный образ - без компилятора, только то, что нужно в рантайме.
FROM node:22-bookworm-slim

# ffmpeg - нужен для воспроизведения аудио.
# python3/pip - нужен для yt-dlp. Ставим через pip и НЕ удаляем pip из образа,
# чтобы внутри контейнера можно было обновить yt-dlp командой:
#   docker compose exec bot pip3 install --break-system-packages -U "yt-dlp[default]"
# Extra "default" обязателен: он тянет yt-dlp-ejs - скрипты, которые yt-dlp
# исполняет через Node, чтобы расшифровать ссылки YouTube.
# YouTube периодически ломает старые версии yt-dlp, так что обновлять нужно
# время от времени (раз в 1-2 месяца, или сразу если музыка перестала играть).
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    ca-certificates \
    && pip3 install --no-cache-dir --break-system-packages -U "yt-dlp[default]" \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN chmod +x docker-entrypoint.sh

# При каждом старте контейнера сначала регистрирует/обновляет слэш-команды
# в Discord API, потом запускает самого бота - руками "npm run deploy-commands"
# после каждого деплоя гонять больше не нужно.
ENTRYPOINT ["./docker-entrypoint.sh"]
