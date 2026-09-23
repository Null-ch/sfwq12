// Open-Meteo: бесплатный прогноз погоды без API-ключа и регистрации.
// https://open-meteo.com/en/docs

const { createHttpClient } = require('../../core/http');
const { describeCode } = require('./weatherCodes');

const weatherHttpError = (url, status) => `Запрос ${url} завершился со статусом ${status}`;

// Open-Meteo периодически отдаёт разовые 503 - утренняя рассылка не должна из-за этого терять город.
const createWeatherHttp = () =>
  createHttpClient({ errorMessage: weatherHttpError, timeoutMs: 10_000, retries: 3, retryDelayMs: 2000 });

function createWeatherService({ http = createWeatherHttp() } = {}) {
  async function geocodeCity(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru&format=json`;
    const data = await http.getJson(url);
    const place = data?.results?.[0];
    if (!place) {
      throw new Error(`Не удалось найти город "${city}". Проверь название (лучше на английском).`);
    }
    return {
      name: place.name,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
    };
  }

  /** Возвращает сводку прогноза на сегодня для указанного города. */
  async function getDailyForecast(city) {
    const place = await geocodeCity(city);

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
      `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max` +
      `&timezone=auto&forecast_days=1`;

    const data = await http.getJson(url);

    return {
      place,
      current: {
        temperature: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        description: describeCode(data.current.weather_code),
      },
      today: {
        tempMax: Math.round(data.daily.temperature_2m_max[0]),
        tempMin: Math.round(data.daily.temperature_2m_min[0]),
        precipitationChance: data.daily.precipitation_probability_max[0],
        windMax: Math.round(data.daily.wind_speed_10m_max[0]),
        description: describeCode(data.daily.weather_code[0]),
      },
    };
  }

  /**
   * Прогноз сразу для нескольких городов. Ошибка по одному городу (например,
   * опечатка в названии) не должна ронять остальные - поэтому Promise.allSettled.
   */
  async function getForecastsForCities(cities) {
    const results = await Promise.allSettled(cities.map((city) => getDailyForecast(city)));

    return results.map((result, i) => ({
      city: cities[i],
      forecast: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null,
    }));
  }

  return { getDailyForecast, getForecastsForCities };
}

module.exports = { createWeatherService };
