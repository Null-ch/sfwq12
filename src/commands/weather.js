const { SlashCommandBuilder } = require('discord.js');
const { parseList } = require('../core/text');
const { buildDetailedEmbed, buildSummaryEmbed } = require('../services/weather/weatherEmbed');

module.exports = ({ config, services }) => ({
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Показать текущий прогноз погоды')
    .addStringOption((opt) =>
      opt
        .setName('city')
        .setDescription(`Город или несколько через запятую (по умолчанию: ${config.weather.cities.join(', ')})`)
        .setRequired(false),
    ),

  async execute(interaction) {
    const cities = parseList(interaction.options.getString('city') || config.weather.cities.join(','));
    await interaction.deferReply();

    // Один город - подробная карточка (текущая погода + сегодня).
    if (cities.length === 1) {
      try {
        const forecast = await services.weather.getDailyForecast(cities[0]);
        return interaction.editReply({ embeds: [buildDetailedEmbed(forecast)] });
      } catch (error) {
        return interaction.editReply(`❌ ${error.message}`);
      }
    }

    // Несколько городов - компактная сводка по каждому.
    const results = await services.weather.getForecastsForCities(cities);
    await interaction.editReply({ embeds: [buildSummaryEmbed(results)] });
  },
});
