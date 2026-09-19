const { EmbedBuilder } = require('discord.js');
const { COLORS, FOOTERS } = require('../../core/theme');
const { discordTime } = require('../../core/discordTime');
const { formatMinutes } = require('./format');

function buildStatsEmbed(stats) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.dota)
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

  return embed.setFooter({ text: FOOTERS.dota });
}

module.exports = { buildStatsEmbed };
