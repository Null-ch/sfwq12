FROM node:20-bullseye-slim

# node:20-bullseye-slim выбран специально: у @discordjs/opus есть готовый
# скомпилированный бинарник под glibc 2.31 (как раз в Debian bullseye), поэтому
# при "npm install" ничего не приходится собирать из исходников. На
# node:20-bookworm-slim (glibc 2.36) готового бинарника нет, npm откатывается на
# сборку через node-gyp, а там своя ошибка - в этом образе просто нет
# компилятора (make/g++).
#
# ffmpeg - нужен для воспроизведения аудио.
# python3/pip - нужен для yt-dlp. Ставим через pip и НЕ удаляем pip из образа,
# чтобы внутри контейнера можно было обновить yt-dlp командой:
#   docker compose exec bot pip3 install -U yt-dlp
# YouTube периодически ломает старые версии yt-dlp, так что это нужно будет
# делать время от времени (раз в 1-2 месяца, или сразу если музыка перестала играть).
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    ca-certificates \
    && pip3 install --no-cache-dir -U yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

CMD ["node", "src/index.js"]
