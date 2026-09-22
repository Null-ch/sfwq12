// Общее оформление сообщений бота: цвета эмбедов и подписи источников данных.

const COLORS = {
  info: 0x5865f2,
  success: 0x57f287,
  weather: 0x00aaff,
  dota: 0xa9302a,
  minecraft: 0x3b8526,
};

const FOOTERS = {
  weather: 'Данные: АХУЕННЫЙ ВИДЖЕТ ПОГОДЫ',
  dota: 'Данные: АХУЕННЫЙ ВИДЖЕТ ДОТЫ',
  minecraft: 'Данные: АХУЕННЫЙ ВИДЖЕТ МАЙНКРАФТА',
};

module.exports = { COLORS, FOOTERS };
