const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder().setName('leave').setDescription('Выгнать бота из голосового канала'),

  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue) {
      return interaction.reply({ content: '❌ Бот не в голосовом канале.', ephemeral: true });
    }

    queue.delete();
    await interaction.reply('👋 Вышел из канала.');
  },
};
