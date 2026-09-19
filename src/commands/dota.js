const { SlashCommandBuilder } = require('discord.js');
const { getPlayerSummary } = require('../services/dotaService');
const { buildStatsEmbed } = require('../services/dotaEmbed');
const { setLink, getLink } = require('../services/dotaLinks');
const config = require('../config');

async function replyWithStats(interaction, accountId) {
  await interaction.deferReply();
  try {
    const stats = await getPlayerSummary(accountId);
    await interaction.editReply({ embeds: [buildStatsEmbed(stats)] });
  } catch (error) {
    await interaction.editReply(`❌ ${error.message}`);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dota')
    .setDescription('Статистика игрока Dota 2')
    .addSubcommand((sub) =>
      sub
        .setName('stats')
        .setDescription('Показать статистику')
        .addUserOption((opt) =>
          opt.setName('member').setDescription('Участник сервера (если он привязал свой профиль через /dota link)'),
        )
        .addStringOption((opt) =>
          opt.setName('account_id').setDescription('Или укажи account_id / ссылку на профиль напрямую'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('link')
        .setDescription('Привязать свой Dota 2 профиль к своему Discord-аккаунту')
        .addStringOption((opt) =>
          opt
            .setName('account_id')
            .setDescription('Твой account_id или ссылка на профиль OpenDota/Dotabuff')
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'link') {
      const accountId = interaction.options.getString('account_id', true);
      try {
        const stats = await getPlayerSummary(accountId);
        setLink(interaction.user.id, stats.accountId);
        return interaction.reply(`✅ Профиль привязан: **${stats.nickname}**.`);
      } catch (error) {
        return interaction.reply({ content: `❌ ${error.message}`, ephemeral: true });
      }
    }

    // sub === 'stats'
    const explicitId = interaction.options.getString('account_id');
    const member = interaction.options.getUser('member');

    let accountId = explicitId;
    if (!accountId) {
      const targetUserId = member?.id || interaction.user.id;
      accountId = getLink(targetUserId);
      if (!accountId && targetUserId === interaction.user.id) {
        accountId = config.dota.defaultAccountId;
      }
    }

    if (!accountId) {
      return interaction.reply({
        content:
          '❌ У этого участника не привязан Dota-профиль. Привяжи его через `/dota link account_id:<...>` или укажи `account_id` напрямую.',
        ephemeral: true,
      });
    }

    return replyWithStats(interaction, accountId);
  },
};
