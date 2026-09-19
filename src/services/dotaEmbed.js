const { EmbedBuilder } = require('discord.js');

function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} мин`;
  return minutes ? `${hours} ч ${minutes} мин` : `${hours} ч`;
}

// <t:...> - Discord сам показывает время в часовом поясе и локали каждого зрителя.
function discordTime(date, style) {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}

function buildStatsEmbed(stats) {
  const embed = new EmbedBuilder()
    .setColor(0xa9302a)
    .setTitle(`Dota 2: ${stats.nickname}`)
    .setThumbnail(stats.avatar || null)
    .setURL(stats.profileUrl || null)
    .addFields(
      { name: 'Ранг', value: stats.rank, inline: true },
      {
        name: 'MMR (оценка)',
        value: stats.mmrEstimate ? String(stats.mmrEstimate) : 'Скрыт/недоступен',
        inline: true,
      },
      {
        name: 'Победы / Поражения',
        value: `${stats.wins}W / ${stats.losses}L (${stats.winrate}%)`,
        inline: true,
      },
    );

  if (stats.steamHours != null) {
    embed.addFields({
      name: 'Всего в Dota 2 (Steam)',
      value: `${Math.round(stats.steamHours).toLocaleString('ru-RU')} ч`,
      inline: true,
    });
  }
  if (stats.totalMatchHours != null) {
    embed.addFields({
      name: 'Всего в матчах',
      value: `${Math.round(stats.totalMatchHours).toLocaleString('ru-RU')} ч`,
      inline: true,
    });
  }

  const today = stats.today;
  embed.addFields({
    name: 'Сегодня',
    value: today.matches
      ? `${today.matches} матч. (${today.wins}W / ${today.losses}L), в игре ${formatMinutes(today.minutes)}`
      : 'Сегодня матчей не было',
    inline: true,
  });

  if (stats.lastMatch) {
    const m = stats.lastMatch;
    embed.addFields({
      name: 'Последний матч',
      value:
        `${discordTime(m.endTime, 'R')} (${discordTime(m.endTime, 'f')})\n` +
        `${m.won ? '✅ Победа' : '❌ Поражение'} на **${m.heroName}**, KDA ${m.kills}/${m.deaths}/${m.assists}, ${m.durationMinutes} мин\n` +
        `[Матч #${m.matchId}](https://www.opendota.com/matches/${m.matchId})`,
    });
  }

  return embed.setFooter({ text: 'Данные: АХУЕННЫЙ ВИДЖЕТ ДОТЫ' });
}

module.exports = { buildStatsEmbed, formatMinutes };
