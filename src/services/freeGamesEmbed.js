const { EmbedBuilder } = require('discord.js');

const PLATFORMS = {
  epic: { name: 'Epic Games Store', color: 0x0078f2 },
  steam: { name: 'Steam', color: 0x66c0f4 },
};

function buildFreeGameEmbed(game) {
  const platform = PLATFORMS[game.platform];
  const price = game.originalPrice ? `~~${game.originalPrice}~~ ` : '';

  let until = 'Точный срок неизвестен — лучше забрать сразу.';
  if (game.endsAt) {
    const ts = Math.floor(game.endsAt.getTime() / 1000);
    until = `Успей забрать до <t:${ts}:f> (<t:${ts}:R>)`;
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
