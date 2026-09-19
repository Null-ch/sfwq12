const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { getForecastsForCities } = require('../services/weatherService');
const config = require('../config');

function scheduleDailyWeather(client) {
  if (!config.weather.channelId) {
    console.warn('⚠️ WEATHER_CHANNEL_ID не задан — ежедневный прогноз погоды отключён.');
    return;
  }

  cron.schedule(
    config.weather.cron,
    async () => {
      try {
        const channel = await client.channels.fetch(config.weather.channelId);
        const results = await getForecastsForCities(config.weather.cities);

        const embed = new EmbedBuilder()
          .setColor(0x00aaff)
          .setTitle('🌤️ Прогноз на сегодня')
          .setFooter({ text: 'Данные: Open-Meteo' })
          .setTimestamp();

        for (const { city, forecast, error } of results) {
          if (forecast) {
            embed.addFields({
              name: `${forecast.place.name}: ${forecast.today.description}`,
              value: `От ${forecast.today.tempMin}°C до ${forecast.today.tempMax}°C\nВероятность осадков: ${forecast.today.precipitationChance}%\nВетер до ${forecast.today.windMax} км/ч`,
            });
          } else {
            embed.addFields({ name: city, value: `⚠️ ${error}` });
          }
        }

        await channel.send({ embeds: [embed] });
      } catch (error) {
        console.error('Не удалось отправить ежедневный прогноз погоды:', error);
      }
    },
    { timezone: config.weather.timezone },
  );

  console.log(
    `☀️ Ежедневный прогноз погоды запланирован (cron "${config.weather.cron}", таймзона ${config.weather.timezone}).`,
  );
}

module.exports = { scheduleDailyWeather };
