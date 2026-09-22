const { EmbedBuilder } = require('discord.js');
const { COLORS, FOOTERS } = require('../../core/theme');
const { discordTime } = require('../../core/discordTime');
const { formatBytes } = require('./format');

function baseEmbed(title) {
  return new EmbedBuilder().setColor(COLORS.minecraft).setTitle(title).setFooter({ text: FOOTERS.minecraft }).setTimestamp();
}

// Ссылка защищена HTTP Basic Auth (логин "mc") - сам пароль бот в чат не пишет,
// чтобы не сводить на нет смысл закрытой ссылки; его знает тот, кто настраивал сервер.
const AUTH_HINT = 'При открытии спросит логин/пароль (логин `mc`) — пароль знает тот, кто настраивал сервер.';

/** Карточка с бессрочной ссылкой на самый свежий бэкап мира. */
function buildBackupEmbed(info) {
  const embed = baseEmbed('🗄️ Бэкап мира')
    .addFields({ name: 'Ссылка', value: info.url })
    .setDescription(AUTH_HINT);
  if (info.size != null) embed.addFields({ name: 'Размер', value: formatBytes(info.size), inline: true });
  if (info.lastModified) {
    embed.addFields({ name: 'Сделан', value: discordTime(info.lastModified, 'R'), inline: true });
  }
  return embed;
}

/** Карточка с ссылкой на клиент-пак, когда он слишком большой, чтобы прикрепить файлом. */
function buildClientLinkEmbed(info) {
  return baseEmbed('📦 Клиент-пак (Forge + моды)')
    .setDescription(AUTH_HINT)
    .addFields({ name: 'Ссылка', value: info.url })
    .addFields({ name: 'Размер', value: formatBytes(info.size), inline: true });
}

module.exports = { buildBackupEmbed, buildClientLinkEmbed };
