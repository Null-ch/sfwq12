const { SlashCommandBuilder } = require('discord.js');
const { buildFreeGameEmbed } = require('../services/freeGames/freeGamesEmbed');

// Discord принимает не больше 10 эмбедов в одном сообщении.
const MAX_EMBEDS = 10;

module.exports = ({ services }) => ({
  data: new SlashCommandBuilder()
    .setName('freegames')
    .setDescription('Что сейчас раздают бесплатно в Epic Games и Steam'),

  async execute(interaction) {
    await interaction.deferReply();

    const games = (await services.freeGames.fetchAllFreeGames()).slice(0, MAX_EMBEDS);
    if (!games.length) {
      return interaction.editReply('Сейчас бесплатных раздач не нашлось.');
    }
    return interaction.editReply({ embeds: games.map(buildFreeGameEmbed) });
  },
});
