const { SlashCommandBuilder } = require('discord.js');
const { createQueueCommand } = require('../music/queueCommand');

module.exports = () =>
  createQueueCommand({
    data: new SlashCommandBuilder().setName('leave').setDescription('Выгнать бота из голосового канала'),
    emptyMessage: '❌ Бот не в голосовом канале.',
    requireTrack: false,
    async run(interaction, queue) {
      queue.delete();
      await interaction.reply('👋 Вышел из канала.');
    },
  });
