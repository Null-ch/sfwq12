const { SlashCommandBuilder } = require('discord.js');
const { createQueueCommand } = require('../music/queueCommand');

module.exports = () =>
  createQueueCommand({
    data: new SlashCommandBuilder().setName('pause').setDescription('Поставить воспроизведение на паузу'),
    emptyMessage: '❌ Сейчас ничего не играет.',
    async run(interaction, queue) {
      queue.node.setPaused(true);
      await interaction.reply('⏸️ Пауза.');
    },
  });
