const { GuildQueueEvent, useMainPlayer } = require('discord-player');
const { EmbedBuilder } = require('discord.js');

/**
 * Не событие discord.js клиента - подписывается на события плеера
 * discord-player (проигрывание трека, ошибки и т.д.).
 */
function registerPlayerEvents(client) {
  const player = useMainPlayer();

  player.events.on(GuildQueueEvent.PlayerStart, (queue, track) => {
    const channel = queue.metadata?.textChannel;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setDescription(`▶️ Сейчас играет: **[${track.title}](${track.url})** — \`${track.duration}\``)
      .setThumbnail(track.thumbnail || null);

    channel.send({ embeds: [embed] }).catch(() => {});
  });

  player.events.on(GuildQueueEvent.PlayerError, (queue, error, track) => {
    console.error(`Ошибка плеера на треке "${track?.title}":`, error);
    const channel = queue.metadata?.textChannel;
    channel?.send(`⚠️ Ошибка воспроизведения "${track?.title}": ${error.message}`).catch(() => {});
  });

  player.events.on(GuildQueueEvent.EmptyChannel, (queue) => {
    const channel = queue.metadata?.textChannel;
    channel?.send('👋 Все вышли из канала, ухожу.').catch(() => {});
  });

  player.events.on(GuildQueueEvent.EmptyQueue, (queue) => {
    const channel = queue.metadata?.textChannel;
    channel?.send('✅ Очередь закончилась.').catch(() => {});
  });

  console.log('🎧 Обработчики событий плеера зарегистрированы');
}

module.exports = { registerPlayerEvents };
