const { SlashCommandBuilder } = require('discord.js');
const { createQueueCommand } = require('../music/queueCommand');

module.exports = () =>
  createQueueCommand({
    data: new SlashCommandBuilder().setName('resume').setDescription('Снять воспроизведение с паузы'),
    emptyMessage: '❌ Сейчас ничего не играет.',
    async run(interaction, queue) {
      queue.node.setPaused(false);
      await interaction.reply('▶️ Продолжаю.');
    },
  });
