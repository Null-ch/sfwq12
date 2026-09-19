const { SlashCommandBuilder } = require('discord.js');
const { createQueueCommand } = require('../music/queueCommand');
const { buildQueueEmbed } = require('../music/ui');

module.exports = () =>
  createQueueCommand({
    data: new SlashCommandBuilder().setName('queue').setDescription('Показать очередь треков'),
    emptyMessage: '❌ Очередь пуста.',
    async run(interaction, queue) {
      await interaction.reply({ embeds: [buildQueueEmbed(queue)] });
    },
  });
