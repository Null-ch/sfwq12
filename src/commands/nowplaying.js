const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../core/theme');
const { createQueueCommand } = require('../music/queueCommand');

module.exports = () =>
  createQueueCommand({
    data: new SlashCommandBuilder().setName('nowplaying').setDescription('Что играет сейчас'),
    emptyMessage: '❌ Сейчас ничего не играет.',
    async run(interaction, queue) {
      const track = queue.currentTrack;
      const progress = queue.node.createProgressBar?.() ?? '';

      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle('🎵 Сейчас играет')
        .setDescription(`**[${track.title}](${track.url})**\n${progress}`)
        .setThumbnail(track.thumbnail || null)
        .addFields({ name: 'Автор', value: track.author || 'Неизвестен', inline: true });

      await interaction.reply({ embeds: [embed] });
    },
  });
