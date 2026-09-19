const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder().setName('resume').setDescription('Снять воспроизведение с паузы'),

  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({ content: '❌ Сейчас ничего не играет.', ephemeral: true });
    }

    queue.node.setPaused(false);
    await interaction.reply('▶️ Продолжаю.');
  },
};
