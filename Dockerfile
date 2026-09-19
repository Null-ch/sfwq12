FROM node:20-bookworm-slim

# ffmpeg - нужен для воспроизведения аудио.
# python3/pip - нужен для yt-dlp. Ставим через pip и НЕ удаляем pip из образа,
# чтобы внутри контейнера можно было обновить yt-dlp командой:
#   docker compose exec bot pip3 install --break-system-packages -U yt-dlp
# YouTube периодически ломает старые версии yt-dlp, так что это нужно будет
# делать время от времени (раз в 1-2 месяца, или сразу если музыка перестала играть).
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    ca-certificates \
    && pip3 install --no-cache-dir --break-system-packages -U yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

CMD ["node", "src/index.js"]
