/**
 * Метка времени Discord: клиент сам показывает её в часовом поясе и локали зрителя.
 * style: 'f' - полная дата, 'R' - относительное время ("через 2 дня").
 */
function discordTime(date, style) {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}

module.exports = { discordTime };
