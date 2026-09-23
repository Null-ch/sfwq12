const { EmbedBuilder } = require('discord.js');
const { COLORS, FOOTERS } = require('../../core/theme');
const { discordTime } = require('../../core/discordTime');
const { formatBytes } = require('./format');

function baseEmbed(title) {
  return new EmbedBuilder().setColor(COLORS.minecraft).setTitle(title).setFooter({ text: FOOTERS.minecraft }).setTimestamp();
}

/** При скачивании файла (не самой страницы) caddy спросит логин/пароль - показываем их. */
function authField(password) {
  return { name: 'Пароль для скачивания', value: `Пароль: \`${password}\`` };
}

/** Карточка с бессрочной ссылкой на самый свежий бэкап мира. */
function buildBackupEmbed(info, password) {
  const embed = baseEmbed('🗄️ Бэкап мира').addFields({ name: 'Ссылка', value: info.url });
  if (info.size != null) embed.addFields({ name: 'Размер', value: formatBytes(info.size), inline: true });
  if (password) embed.addFields(authField(password));
  return embed;
}

/** Карточка с ссылкой на клиент-пак, когда он слишком большой, чтобы прикрепить файлом. */
function buildClientLinkEmbed(info, password) {
  const embed = baseEmbed('📦 Клиент-пак (Forge + моды)')
    .addFields({ name: 'Ссылка', value: info.url })
    .addFields({ name: 'Размер', value: formatBytes(info.size), inline: true });
  if (password) embed.addFields(authField(password));
  return embed;
}

module.exports = { buildBackupEmbed, buildClientLinkEmbed };
