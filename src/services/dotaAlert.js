const { getTodayStats } = require('./dotaService');
const { formatMinutes } = require('./dotaEmbed');

/**
 * Считает, сколько игрок отыграл сегодня, и сравнивает с порогом.
 * low=false и hasData=false - пинговать нельзя (данных нет).
 */
async function checkTodayPlaytime(accountId, minHours) {
  const { hasData, today } = await getTodayStats(accountId);
  return {
    hasData,
    minutes: today.minutes,
    matches: today.matches,
    low: hasData && today.minutes < minHours * 60,
  };
}

function buildAlertText(userId, minutes) {
  return (
     `<@${userId}> 🚨 СЕГОДНЯ ДЛИТЕЛЬНОСТЬ ИГРЫ В ДОТУ: ${formatMinutes(minutes)} ⚠️ ` +
    '🔴 КРИТИЧЕСКИ низкое значение, необходимо СРОЧНО запустить любимую игру 🎮🔥'
  );
}

// allowedMentions: явно разрешаем пинг только этого пользователя.
function buildAlertMessage(userId, minutes) {
  return { content: buildAlertText(userId, minutes), allowedMentions: { users: [userId] } };
}

function buildPraiseText(userId, minutes) {
  return (
    `<@${userId}> 🏆 СЕГОДНЯ ДЛИТЕЛЬНОСТЬ ИГРЫ В ДОТУ: ${formatMinutes(minutes)} ✅ ` +
    'Норма выполнена, так держать, настоящий воин! 🎮🔥'
  );
}

function buildPraiseMessage(userId, minutes) {
  return { content: buildPraiseText(userId, minutes), allowedMentions: { users: [userId] } };
}

// Что отправить по итогам проверки: напоминание при низком значении, иначе похвалу.
function buildDailyMessage(userId, result) {
  return result.low ? buildAlertMessage(userId, result.minutes) : buildPraiseMessage(userId, result.minutes);
}

module.exports = { checkTodayPlaytime, buildAlertMessage, buildPraiseMessage, buildDailyMessage };
