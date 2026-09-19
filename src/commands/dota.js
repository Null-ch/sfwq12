const { SlashCommandBuilder } = require('discord.js');
const { buildStatsEmbed } = require('../services/dota/dotaEmbed');
const { EPHEMERAL } = require('../core/ephemeral');

module.exports = ({ config, services }) => {
  const { dota, dotaLinks } = services;

  async function replyWithStats(interaction, accountId) {
    await interaction.deferReply();
    try {
      const stats = await dota.getPlayerSummary(accountId);
      await interaction.editReply({ embeds: [buildStatsEmbed(stats)] });
    } catch (error) {
      await interaction.editReply(`❌ ${error.message}`);
    }
  }

  async function link(interaction) {
    const accountId = interaction.options.getString('account_id', true);
    try {
      const stats = await dota.getPlayerSummary(accountId);
      dotaLinks.setLink(interaction.user.id, stats.accountId);
      return interaction.reply(`✅ Профиль привязан: **${stats.nickname}**.`);
    } catch (error) {
      return interaction.reply({ content: `❌ ${error.message}`, ...EPHEMERAL });
    }
  }

  /** account_id из параметра, иначе из привязки участника, иначе (для себя) из настроек бота. */
  function resolveAccountId(interaction) {
    const explicitId = interaction.options.getString('account_id');
    if (explicitId) return explicitId;

    const member = interaction.options.getUser('member');
    const targetUserId = member?.id || interaction.user.id;
    const linked = dotaLinks.getLink(targetUserId);
    if (linked) return linked;

    return targetUserId === interaction.user.id ? config.dota.defaultAccountId : null;
  }

  async function stats(interaction) {
    const accountId = resolveAccountId(interaction);
    if (!accountId) {
      return interaction.reply({
        content:
          '❌ У этого участника не привязан Dota-профиль. Привяжи его через `/dota link account_id:<...>` или укажи `account_id` напрямую.',
        ...EPHEMERAL,
      });
    }
    return replyWithStats(interaction, accountId);
  }

  const handlers = { link, stats };

  return {
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
      return handlers[interaction.options.getSubcommand()](interaction);
    },
  };
};
