const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder().setName('queue').setDescription('Показать очередь треков'),

  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({ content: '❌ Очередь пуста.', ephemeral: true });
    }

    const upcoming = queue.tracks.toArray().slice(0, 10);
    const list = upcoming
      .map((t, i) => `**${i + 1}.** ${t.title} — \`${t.duration}\``)
      .join('\n') || 'Очередь пуста.';

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎶 Очередь')
      .addFields(
        {
          name: 'Сейчас играет',
          value: `${queue.currentTrack.title} — \`${queue.currentTrack.duration}\``,
        },
        { name: `Дальше (${queue.tracks.size})`, value: list },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
