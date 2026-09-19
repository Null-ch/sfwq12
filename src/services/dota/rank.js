const RANK_TIERS = {
  1: 'Рекрут',
  2: 'Страж',
  3: 'Страж',
  4: 'Часовой',
  5: 'Легенда',
  6: 'Властелин',
  7: 'Архонт',
  8: 'Божество',
  9: 'Титан',
  11: 'Бессмертный',
};

function describeRank(rankTier) {
  if (!rankTier) return 'Нет данных (профиль скрыт или мало матчей)';
  const tier = Math.floor(rankTier / 10);
  const star = rankTier % 10;
  const name = RANK_TIERS[tier] || 'Неизвестно';
  if (tier >= 9) return name; // Immortal без звёзд
  return `${name} ${star}`;
}

module.exports = { describeRank };
