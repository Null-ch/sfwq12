const { buildDailyEmbed } = require('../services/weather/weatherEmbed');

function createDailyWeatherJob({ config, services }) {
  const { cron, timezone, cities } = config.weather;

  return {
    name: 'weather',
    disabledReason: config.notify.channelId
      ? null
      : '⚠️ NOTIFY_CHANNEL_ID не задан — ежедневный прогноз погоды отключён.',
    cron,
    timezone,
    errorMessage: 'Не удалось отправить ежедневный прогноз погоды:',
    startedMessage: `☀️ Ежедневный прогноз погоды запланирован (cron "${cron}", таймзона ${timezone}).`,
    async run(client) {
      const channel = await client.channels.fetch(config.notify.channelId);
      const results = await services.weather.getForecastsForCities(cities);
      await channel.send({ embeds: [buildDailyEmbed(results)] });
    },
  };
}

module.exports = { createDailyWeatherJob };
