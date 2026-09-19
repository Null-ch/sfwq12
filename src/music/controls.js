const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

const PREFIX = 'music:';

function buildControls(paused = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${PREFIX}pause`)
      .setLabel(paused ? 'Продолжить' : 'Пауза')
      .setEmoji(paused ? '▶️' : '⏸️')
      .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`${PREFIX}skip`).setLabel('Скип').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${PREFIX}queue`).setLabel('Очередь').setEmoji('📜').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${PREFIX}stop`).setLabel('Стоп').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
  );
}

function buildQueueEmbed(queue) {
  const upcoming = queue.tracks.toArray().slice(0, 10);
  const list =
    upcoming.map((t, i) => `**${i + 1}.** ${t.title} — \`${t.duration}\``).join('\n') || 'Очередь пуста.';

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🎶 Очередь')
    .addFields(
      {
        name: 'Сейчас играет',
        value: `${queue.currentTrack.title} — \`${queue.currentTrack.duration}\``,
      },
      { name: `Дальше (${queue.tracks.size})`, value: list },
    );
}

function isMusicButton(interaction) {
  return interaction.isButton() && interaction.customId.startsWith(PREFIX);
}

/**
 * Обработчик кнопок под сообщением "Сейчас играет".
 * getQueue вынесен в параметр, чтобы логику можно было проверить без живого Discord.
 */
async function handleMusicButton(interaction, getQueue = useQueue) {
  const action = interaction.customId.slice(PREFIX.length);
  const queue = getQueue(interaction.guild.id);

  // Сообщение осталось от прошлой сессии (очередь закончилась или бот перезапускался).
  if (!queue || !queue.currentTrack) {
    return interaction.update({ components: [] });
  }

  if (action === 'queue') {
    return interaction.reply({ embeds: [buildQueueEmbed(queue)], ephemeral: true });
  }

  // Управлять плеером можно только из того же голосового канала, где сидит бот.
  const userChannelId = interaction.member?.voice?.channelId;
  if (!userChannelId || userChannelId !== queue.channel?.id) {
    return interaction.reply({
      content: '❌ Управлять музыкой можно только из голосового канала, где сидит бот.',
      ephemeral: true,
    });
  }

  const who = interaction.member.displayName ?? interaction.user.username;

  switch (action) {
    case 'pause': {
      const paused = !queue.node.isPaused();
      queue.node.setPaused(paused);
      return interaction.update({ components: [buildControls(paused)] });
    }
    case 'skip': {
      const skipped = queue.currentTrack;
      queue.node.skip();
      return interaction.reply(`⏭️ ${who} пропустил: **${skipped.title}**`);
    }
    case 'stop': {
      queue.delete();
      await interaction.update({ components: [] });
      return interaction.followUp(`⏹️ ${who} остановил воспроизведение.`);
    }
    default:
      return interaction.reply({ content: '❌ Неизвестная кнопка.', ephemeral: true });
  }
}

module.exports = { buildControls, buildQueueEmbed, isMusicButton, handleMusicButton };
