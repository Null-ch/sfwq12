const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Установить громкость (0-100)')
    .addIntegerOption((opt) =>
      opt.setName('level').setDescription('Громкость от 0 до 100').setRequired(true).setMinValue(0).setMaxValue(100),
    ),

  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue) {
      return interaction.reply({ content: '❌ Бот сейчас ничего не играет.', ephemeral: true });
    }

    const level = interaction.options.getInteger('level', true);
    queue.node.setVolume(level);
    await interaction.reply(`🔊 Громкость установлена на ${level}%.`);
  },
};
