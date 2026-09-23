const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { COLORS, FOOTERS } = require('../../core/theme');
const { discordTime } = require('../../core/discordTime');

// Префикс customId кнопок заявок: по нему interactionCreate отличает их от чужих кнопок.
const APPLICATION_BUTTON_PREFIX = 'mcapp:';

const STATUS_LABELS = {
  pending: '⏳ Ждёт решения',
  approved: '✅ Одобрена — ник добавлен в whitelist',
  rejected: '❌ Отклонена',
};

const STATUS_COLORS = {
  pending: COLORS.minecraft,
  approved: COLORS.success,
  rejected: 0xed4245,
};

function buildApplicationEmbed(app) {
  const embed = new EmbedBuilder()
    .setColor(STATUS_COLORS[app.status] ?? COLORS.minecraft)
    .setTitle(`🎮 Заявка на игру: ${app.nickname}`)
    .addFields(
      { name: 'Ник', value: `\`${app.nickname}\``, inline: true },
      { name: 'Откуда', value: app.source === 'discord' ? 'Discord' : 'Сайт', inline: true },
      { name: 'Подана', value: discordTime(new Date(app.createdAt), 'R'), inline: true },
    )
    .setFooter({ text: FOOTERS.minecraft });

  if (app.discordUserId) embed.addFields({ name: 'Участник', value: `<@${app.discordUserId}>`, inline: true });
  else if (app.contact) embed.addFields({ name: 'Контакт', value: app.contact });
  if (app.comment) embed.addFields({ name: 'Комментарий', value: app.comment });

  const decided = app.decidedBy ? ` (${app.decidedBy})` : '';
  embed.addFields({ name: 'Статус', value: `${STATUS_LABELS[app.status] ?? app.status}${app.status === 'pending' ? '' : decided}` });
  return embed;
}

function buildApplicationButtons(app) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${APPLICATION_BUTTON_PREFIX}approve:${app.id}`)
      .setLabel('Одобрить')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${APPLICATION_BUTTON_PREFIX}reject:${app.id}`)
      .setLabel('Отклонить')
      .setEmoji('✖️')
      .setStyle(ButtonStyle.Danger),
  );
}

/** Сообщение для одобряющего: с кнопками, пока заявка ждёт решения, и без них после. */
function buildApplicationMessage(app) {
  return {
    embeds: [buildApplicationEmbed(app)],
    components: app.status === 'pending' ? [buildApplicationButtons(app)] : [],
  };
}

module.exports = { APPLICATION_BUTTON_PREFIX, buildApplicationMessage };
