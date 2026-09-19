const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../core/theme');

// Префикс customId кнопок плеера: по нему interactionCreate отличает их от чужих кнопок.
const BUTTON_PREFIX = 'music:';

function buildControls(paused = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${BUTTON_PREFIX}pause`)
      .setLabel(paused ? 'Продолжить' : 'Пауза')
      .setEmoji(paused ? '▶️' : '⏸️')
      .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${BUTTON_PREFIX}skip`)
      .setLabel('Скип')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${BUTTON_PREFIX}queue`)
      .setLabel('Очередь')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${BUTTON_PREFIX}stop`)
      .setLabel('Стоп')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger),
  );
}

function buildQueueEmbed(queue) {
  const upcoming = queue.tracks.toArray().slice(0, 10);
  const list =
    upcoming.map((t, i) => `**${i + 1}.** ${t.title} — \`${t.duration}\``).join('\n') || 'Очередь пуста.';

  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('🎶 Очередь')
    .addFields(
      {
        name: 'Сейчас играет',
        value: `${queue.currentTrack.title} — \`${queue.currentTrack.duration}\``,
      },
      { name: `Дальше (${queue.tracks.size})`, value: list },
    );
}

module.exports = { BUTTON_PREFIX, buildControls, buildQueueEmbed };
