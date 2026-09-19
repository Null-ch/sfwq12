const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Остановить воспроизведение, очистить очередь и выйти из канала'),

  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue) {
      return interaction.reply({ content: '❌ Бот сейчас ничего не играет.', ephemeral: true });
    }

    queue.delete();
    await interaction.reply('⏹️ Остановлено, очередь очищена.');
  },
};
