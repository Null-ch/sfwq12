const { EmbedBuilder } = require('discord.js');
const { discordTime } = require('../../core/discordTime');

const PLATFORMS = {
  epic: { name: 'Epic Games Store', color: 0x0078f2 },
  steam: { name: 'Steam', color: 0x66c0f4 },
};

function buildFreeGameEmbed(game) {
  const platform = PLATFORMS[game.platform];
  const price = game.originalPrice ? `~~${game.originalPrice}~~ ` : '';

  let until = 'Точный срок неизвестен — лучше забрать сразу.';
  if (game.endsAt) {
    until = `Успей забрать до ${discordTime(game.endsAt, 'f')} (${discordTime(game.endsAt, 'R')})`;
  }

  const embed = new EmbedBuilder()
    .setColor(platform.color)
    .setTitle(`🎁 ${game.title}`)
    .setURL(game.url)
    .setDescription(`${price}**Бесплатно** — ${platform.name}\n${until}`)
    .setFooter({ text: game.endsAtSource === 'gamerpower' ? `${platform.name} · срок: GamerPower.com` : platform.name });

  if (game.image) embed.setImage(game.image);
  return embed;
}

module.exports = { buildFreeGameEmbed };
