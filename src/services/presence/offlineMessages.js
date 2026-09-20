// 1 день, 2-4 дня, 5-20 дней, 21 день...
function formatDays(days) {
  const lastTwo = days % 100;
  const last = days % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${days} дней`;
  if (last === 1) return `${days} день`;
  if (last >= 2 && last <= 4) return `${days} дня`;
  return `${days} дней`;
}

// allowedMentions: явно разрешаем пинг только тех, о ком пишем.
function buildOfflineMessage(entries) {
  const lines = entries.map(({ userId, days }) => `<@${userId}> 👻 дней с момента последнего пришествия ${formatDays(days)}`);
  return {
    content: lines.join('\n'),
    allowedMentions: { users: entries.map(({ userId }) => userId) },
  };
}

module.exports = { formatDays, buildOfflineMessage };
