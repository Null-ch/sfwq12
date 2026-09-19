const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDailyForecast, getForecastsForCities } = require('../services/weatherService');
const config = require('../config');

function parseCities(input) {
  return input
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

module.exports = {
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
    const cities = parseCities(interaction.options.getString('city') || config.weather.cities.join(','));
    await interaction.deferReply();

    // Один город - подробная карточка (текущая погода + сегодня).
    if (cities.length === 1) {
      try {
        const forecast = await getDailyForecast(cities[0]);

        const embed = new EmbedBuilder()
          .setColor(0x00aaff)
          .setTitle(`🌤️ Погода: ${forecast.place.name}, ${forecast.place.country}`)
          .addFields(
            {
              name: 'Сейчас',
              value: `${forecast.current.description}, ${forecast.current.temperature}°C (ощущается как ${forecast.current.feelsLike}°C)`,
            },
            {
              name: 'Сегодня',
              value: `${forecast.today.description}\nОт ${forecast.today.tempMin}°C до ${forecast.today.tempMax}°C\nВероятность осадков: ${forecast.today.precipitationChance}%\nВетер до ${forecast.today.windMax} км/ч`,
            },
          )
          .setFooter({ text: 'Данные: АХУЕННЫЙ ВИДЖЕТ ПОГОДЫ' })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (error) {
        return interaction.editReply(`❌ ${error.message}`);
      }
    }

    // Несколько городов - компактная сводка по каждому.
    const results = await getForecastsForCities(cities);

    const embed = new EmbedBuilder()
      .setColor(0x00aaff)
      .setTitle('🌤️ Погода')
      .setFooter({ text: 'Данные: АХУЕННЫЙ ВИДЖЕТ ПОГОДЫ' })
      .setTimestamp();

    for (const { city, forecast, error } of results) {
      if (forecast) {
        embed.addFields({
          name: `${forecast.place.name}: ${forecast.current.description}, ${forecast.current.temperature}°C`,
          value: `Сегодня от ${forecast.today.tempMin}°C до ${forecast.today.tempMax}°C, осадки ${forecast.today.precipitationChance}%`,
        });
      } else {
        embed.addFields({ name: city, value: `⚠️ ${error}` });
      }
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
