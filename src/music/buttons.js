const { useQueue } = require('discord-player');
const { EPHEMERAL } = require('../core/ephemeral');
const { BUTTON_PREFIX, buildControls, buildQueueEmbed } = require('./ui');

/**
 * Действия кнопок, меняющие состояние плеера. Новую кнопку можно добавить,
 * дописав сюда обработчик (и саму кнопку в ui.js), - остальной код не трогаем.
 * Каждый обработчик получает interaction, очередь и имя того, кто нажал.
 */
const CONTROL_ACTIONS = {
  async pause(interaction, queue) {
    const paused = !queue.node.isPaused();
    queue.node.setPaused(paused);
    return interaction.update({ components: [buildControls(paused)] });
  },

  async skip(interaction, queue, who) {
    const skipped = queue.currentTrack;
    queue.node.skip();
    return interaction.reply(`⏭️ ${who} пропустил: **${skipped.title}**`);
  },

  async stop(interaction, queue, who) {
    queue.delete();
    await interaction.update({ components: [] });
    return interaction.followUp(`⏹️ ${who} остановил воспроизведение.`);
  },
};

function isMusicButton(interaction) {
  return interaction.isButton() && interaction.customId.startsWith(BUTTON_PREFIX);
}

/**
 * Обработчик кнопок под сообщением "Сейчас играет".
 * getQueue вынесен в параметр, чтобы логику можно было проверить без живого Discord.
 */
async function handleMusicButton(interaction, getQueue = useQueue) {
  const action = interaction.customId.slice(BUTTON_PREFIX.length);
  const queue = getQueue(interaction.guild.id);

  // Сообщение осталось от прошлой сессии (очередь закончилась или бот перезапускался).
  if (!queue || !queue.currentTrack) {
    return interaction.update({ components: [] });
  }

  // Очередь смотрят все, даже не сидя в голосовом канале.
  if (action === 'queue') {
    return interaction.reply({ embeds: [buildQueueEmbed(queue)], ...EPHEMERAL });
  }

  // Управлять плеером можно только из того же голосового канала, где сидит бот.
  const userChannelId = interaction.member?.voice?.channelId;
  if (!userChannelId || userChannelId !== queue.channel?.id) {
    return interaction.reply({
      content: '❌ Управлять музыкой можно только из голосового канала, где сидит бот.',
      ...EPHEMERAL,
    });
  }

  const handler = CONTROL_ACTIONS[action];
  if (!handler) {
    return interaction.reply({ content: '❌ Неизвестная кнопка.', ...EPHEMERAL });
  }

  const who = interaction.member.displayName ?? interaction.user.username;
  return handler(interaction, queue, who);
}

module.exports = {
  errorLabel: 'Ошибка кнопки музыки:',
  matches: isMusicButton,
  handle: handleMusicButton,
};
