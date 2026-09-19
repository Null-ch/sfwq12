const { formatMinutes } = require('./format');

// allowedMentions: явно разрешаем пинг только этого пользователя.
function buildAlertMessage(userId, minutes) {
  return {
    content:
      `<@${userId}> 🚨 СЕГОДНЯ ДЛИТЕЛЬНОСТЬ ИГРЫ В ДОТУ: ${formatMinutes(minutes)} ⚠️ ` +
      '🔴 КРИТИЧЕСКИ низкое значение, необходимо СРОЧНО запустить любимую игру 🎮🔥',
    allowedMentions: { users: [userId] },
  };
}

function buildPraiseMessage(userId, minutes) {
  return {
    content:
      `<@${userId}> 🏆 СЕГОДНЯ ДЛИТЕЛЬНОСТЬ ИГРЫ В ДОТУ: ${formatMinutes(minutes)} ✅ ` +
      'Норма выполнена, так держать, настоящий воин! 🎮🔥',
    allowedMentions: { users: [userId] },
  };
}

// Что отправить по итогам проверки: напоминание при низком значении, иначе похвалу.
function buildDailyMessage(userId, result) {
  return result.low ? buildAlertMessage(userId, result.minutes) : buildPraiseMessage(userId, result.minutes);
}

module.exports = { buildAlertMessage, buildPraiseMessage, buildDailyMessage };
