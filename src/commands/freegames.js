const { SlashCommandBuilder } = require('discord.js');
const { fetchAllFreeGames } = require('../services/freeGamesService');
const { buildFreeGameEmbed } = require('../services/freeGamesEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('freegames')
    .setDescription('Что сейчас раздают бесплатно в Epic Games и Steam'),

  async execute(interaction) {
    await interaction.deferReply();

    const games = (await fetchAllFreeGames()).slice(0, 10);
    if (!games.length) {
      return interaction.editReply('Сейчас бесплатных раздач не нашлось.');
    }
    return interaction.editReply({ embeds: games.map(buildFreeGameEmbed) });
  },
};
