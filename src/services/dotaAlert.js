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
    `<@${userId}> СЕГОДНЯ ДЛИТЕЛЬНОСТЬ ИГРЫ В ДОТУ : ${formatMinutes(minutes)} ` +
    'критически низкое значение, вам необходимо запустить любимую игру'
  );
}

// allowedMentions: явно разрешаем пинг только этого пользователя.
function buildAlertMessage(userId, minutes) {
  return { content: buildAlertText(userId, minutes), allowedMentions: { users: [userId] } };
}

module.exports = { checkTodayPlaytime, buildAlertMessage };
