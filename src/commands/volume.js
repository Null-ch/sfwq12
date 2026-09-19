const { SlashCommandBuilder } = require('discord.js');
const { createQueueCommand } = require('../music/queueCommand');

module.exports = () =>
  createQueueCommand({
    data: new SlashCommandBuilder()
      .setName('volume')
      .setDescription('Установить громкость (0-100)')
      .addIntegerOption((opt) =>
        opt.setName('level').setDescription('Громкость от 0 до 100').setRequired(true).setMinValue(0).setMaxValue(100),
      ),
    emptyMessage: '❌ Бот сейчас ничего не играет.',
    requireTrack: false,
    async run(interaction, queue) {
      const level = interaction.options.getInteger('level', true);
      queue.node.setVolume(level);
      await interaction.reply(`🔊 Громкость установлена на ${level}%.`);
    },
  });
