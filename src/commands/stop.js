const { SlashCommandBuilder } = require('discord.js');
const { createQueueCommand } = require('../music/queueCommand');

module.exports = () =>
  createQueueCommand({
    data: new SlashCommandBuilder()
      .setName('stop')
      .setDescription('Остановить воспроизведение, очистить очередь и выйти из канала'),
    emptyMessage: '❌ Бот сейчас ничего не играет.',
    requireTrack: false,
    async run(interaction, queue) {
      queue.delete();
      await interaction.reply('⏹️ Остановлено, очередь очищена.');
    },
  });
