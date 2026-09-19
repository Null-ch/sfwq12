const { GuildQueueEvent } = require('discord-player');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../core/theme');
const { buildControls } = require('./ui');

/**
 * Подписывается на события плеера discord-player (проигрывание трека, ошибки и т.д.).
 * Это не события клиента discord.js, поэтому модуль лежит рядом с музыкой, а не в events/.
 */
function registerPlayerEvents(player) {
  // Сообщение "Сейчас играет" с кнопками хранится в metadata очереди, чтобы
  // при смене трека/паузе/конце очереди можно было обновить или убрать кнопки.
  const setControls = (queue, paused) =>
    queue.metadata?.controlsMessage?.edit({ components: [buildControls(paused)] }).catch(() => {});
  const clearControls = (queue) => {
    queue.metadata?.controlsMessage?.edit({ components: [] }).catch(() => {});
    if (queue.metadata) queue.metadata.controlsMessage = null;
  };

  player.events.on(GuildQueueEvent.PlayerStart, async (queue, track) => {
    const channel = queue.metadata?.textChannel;
    if (!channel) return;

    // У предыдущего трека кнопки уже не нужны.
    clearControls(queue);

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setDescription(`▶️ Сейчас играет: **[${track.title}](${track.url})** — \`${track.duration}\``)
      .setThumbnail(track.thumbnail || null);

    const message = await channel
      .send({ embeds: [embed], components: [buildControls(queue.node.isPaused())] })
      .catch(() => null);
    queue.metadata.controlsMessage = message;
  });

  // Пауза/продолжение через /pause и /resume тоже меняют подпись кнопки.
  player.events.on(GuildQueueEvent.PlayerPause, (queue) => setControls(queue, true));
  player.events.on(GuildQueueEvent.PlayerResume, (queue) => setControls(queue, false));
  player.events.on(GuildQueueEvent.Disconnect, clearControls);

  player.on('error', (error) => console.error('[player error]', error));
  player.events.on(GuildQueueEvent.Error, (queue, error) => console.error('[queue error]', error));
  player.events.on(GuildQueueEvent.Debug, (queue, message) => {
    if (/connect|voice|dave|ready|disconnect|stream/i.test(message)) console.log('[player debug]', message);
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
    clearControls(queue);
    const channel = queue.metadata?.textChannel;
    channel?.send('✅ Очередь закончилась.').catch(() => {});
  });

  console.log('🎧 Обработчики событий плеера зарегистрированы');
}

module.exports = { registerPlayerEvents };
