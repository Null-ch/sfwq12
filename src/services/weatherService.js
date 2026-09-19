// Open-Meteo: бесплатный прогноз погоды без API-ключа и регистрации.
// https://open-meteo.com/en/docs

const WEATHER_CODES = {
  0: 'Ясно',
  1: 'Преимущественно ясно',
  2: 'Переменная облачность',
  3: 'Пасмурно',
  45: 'Туман',
  48: 'Изморозь',
  51: 'Слабая морось',
  53: 'Морось',
  55: 'Сильная морось',
  56: 'Ледяная морось',
  57: 'Сильная ледяная морось',
  61: 'Небольшой дождь',
  63: 'Дождь',
  65: 'Сильный дождь',
  66: 'Ледяной дождь',
  67: 'Сильный ледяной дождь',
  71: 'Небольшой снег',
  73: 'Снег',
  75: 'Сильный снег',
  77: 'Снежные зёрна',
  80: 'Небольшие ливни',
  81: 'Ливни',
  82: 'Сильные ливни',
  85: 'Небольшой снегопад',
  86: 'Сильный снегопад',
  95: 'Гроза',
  96: 'Гроза с небольшим градом',
  99: 'Гроза с сильным градом',
};

function describeCode(code) {
  return WEATHER_CODES[code] || 'Нет данных';
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Запрос ${url} завершился со статусом ${res.status}`);
  }
  return res.json();
}

async function geocodeCity(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru&format=json`;
  const data = await fetchJson(url);
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

/**
 * Возвращает сводку прогноза на сегодня для указанного города.
 */
async function getDailyForecast(city) {
  const place = await geocodeCity(city);

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max` +
    `&timezone=auto&forecast_days=1`;

  const data = await fetchJson(url);

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

module.exports = { getDailyForecast, getForecastsForCities };
