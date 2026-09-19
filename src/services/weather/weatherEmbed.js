const { EmbedBuilder } = require('discord.js');
const { COLORS, FOOTERS } = require('../../core/theme');

function baseEmbed(title) {
  return new EmbedBuilder()
    .setColor(COLORS.weather)
    .setTitle(title)
    .setFooter({ text: FOOTERS.weather })
    .setTimestamp();
}

/** Подробная карточка по одному городу: текущая погода и прогноз на сегодня. */
function buildDetailedEmbed(forecast) {
  return baseEmbed(`🌤️ Погода: ${forecast.place.name}, ${forecast.place.country}`).addFields(
    {
      name: 'Сейчас',
      value: `${forecast.current.description}, ${forecast.current.temperature}°C (ощущается как ${forecast.current.feelsLike}°C)`,
    },
    {
      name: 'Сегодня',
      value: `${forecast.today.description}\nОт ${forecast.today.tempMin}°C до ${forecast.today.tempMax}°C\nВероятность осадков: ${forecast.today.precipitationChance}%\nВетер до ${forecast.today.windMax} км/ч`,
    },
  );
}

/** Общий каркас сводки по нескольким городам: ошибки городов показываются отдельными полями. */
function buildCitiesEmbed(title, results, describeForecast) {
  const embed = baseEmbed(title);
  for (const { city, forecast, error } of results) {
    embed.addFields(forecast ? describeForecast(forecast) : { name: city, value: `⚠️ ${error}` });
  }
  return embed;
}

/** Компактная сводка для /weather по нескольким городам. */
function buildSummaryEmbed(results) {
  return buildCitiesEmbed('🌤️ Погода', results, (forecast) => ({
    name: `${forecast.place.name}: ${forecast.current.description}, ${forecast.current.temperature}°C`,
    value: `Сегодня от ${forecast.today.tempMin}°C до ${forecast.today.tempMax}°C, осадки ${forecast.today.precipitationChance}%`,
  }));
}

/** Утренний автопост: прогноз на день по каждому городу. */
function buildDailyEmbed(results) {
  return buildCitiesEmbed('🌤️ Прогноз на сегодня', results, (forecast) => ({
    name: `${forecast.place.name}: ${forecast.today.description}`,
    value: `От ${forecast.today.tempMin}°C до ${forecast.today.tempMax}°C\nВероятность осадков: ${forecast.today.precipitationChance}%\nВетер до ${forecast.today.windMax} км/ч`,
  }));
}

module.exports = { buildDetailedEmbed, buildSummaryEmbed, buildDailyEmbed };
