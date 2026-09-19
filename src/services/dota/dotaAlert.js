/**
 * Считает, сколько игрок отыграл сегодня, и сравнивает с порогом.
 * low=false и hasData=false - пинговать нельзя (данных нет).
 */
function createDotaAlert({ dota }) {
  async function checkTodayPlaytime(accountId, minHours) {
    const { hasData, today } = await dota.getTodayStats(accountId);
    return {
      hasData,
      minutes: today.minutes,
      matches: today.matches,
      low: hasData && today.minutes < minHours * 60,
    };
  }

  return { checkTodayPlaytime };
}

module.exports = { createDotaAlert };
