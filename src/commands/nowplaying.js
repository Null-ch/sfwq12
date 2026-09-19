const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder().setName('nowplaying').setDescription('Что играет сейчас'),

  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({ content: '❌ Сейчас ничего не играет.', ephemeral: true });
    }

    const track = queue.currentTrack;
    const progress = queue.node.createProgressBar?.() ?? '';

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎵 Сейчас играет')
      .setDescription(`**[${track.title}](${track.url})**\n${progress}`)
      .setThumbnail(track.thumbnail || null)
      .addFields({ name: 'Автор', value: track.author || 'Неизвестен', inline: true });

    await interaction.reply({ embeds: [embed] });
  },
};
