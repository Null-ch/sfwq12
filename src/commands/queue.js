const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildQueueEmbed } = require('../music/controls');

module.exports = {
  data: new SlashCommandBuilder().setName('queue').setDescription('Показать очередь треков'),

  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({ content: '❌ Очередь пуста.', ephemeral: true });
    }

    await interaction.reply({ embeds: [buildQueueEmbed(queue)] });
  },
};
