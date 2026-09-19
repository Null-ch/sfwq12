const { SlashCommandBuilder } = require('discord.js');
const { createQueueCommand } = require('../music/queueCommand');

module.exports = () =>
  createQueueCommand({
    data: new SlashCommandBuilder().setName('skip').setDescription('Пропустить текущий трек'),
    emptyMessage: '❌ Сейчас ничего не играет.',
    async run(interaction, queue) {
      const skipped = queue.currentTrack;
      queue.node.skip();
      await interaction.reply(`⏭️ Пропущено: **${skipped.title}**`);
    },
  });
