const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { getDailyForecast } = require('../services/weatherService');
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
        const forecast = await getDailyForecast(config.weather.city);

        const embed = new EmbedBuilder()
          .setColor(0x00aaff)
          .setTitle(`🌤️ Прогноз на сегодня: ${forecast.place.name}`)
          .addFields({
            name: forecast.today.description,
            value: `От ${forecast.today.tempMin}°C до ${forecast.today.tempMax}°C\nВероятность осадков: ${forecast.today.precipitationChance}%\nВетер до ${forecast.today.windMax} км/ч`,
          })
          .setFooter({ text: 'Данные: Open-Meteo' })
          .setTimestamp();

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
