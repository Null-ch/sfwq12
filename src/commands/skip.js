const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Пропустить текущий трек'),

  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({ content: '❌ Сейчас ничего не играет.', ephemeral: true });
    }

    const skipped = queue.currentTrack;
    queue.node.skip();
    await interaction.reply(`⏭️ Пропущено: **${skipped.title}**`);
  },
};
