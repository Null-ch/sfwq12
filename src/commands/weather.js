const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDailyForecast } = require('../services/weatherService');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Показать текущий прогноз погоды')
    .addStringOption((opt) =>
      opt.setName('city').setDescription(`Город (по умолчанию: ${config.weather.city})`).setRequired(false),
    ),

  async execute(interaction) {
    const city = interaction.options.getString('city') || config.weather.city;
    await interaction.deferReply();

    try {
      const forecast = await getDailyForecast(city);

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
        .setFooter({ text: 'Данные: Open-Meteo' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply(`❌ ${error.message}`);
    }
  },
};
