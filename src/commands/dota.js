const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPlayerSummary } = require('../services/dotaService');
const { setLink, getLink } = require('../services/dotaLinks');
const config = require('../config');

async function replyWithStats(interaction, accountId) {
  await interaction.deferReply();
  try {
    const stats = await getPlayerSummary(accountId);

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

    if (stats.lastMatch) {
      const m = stats.lastMatch;
      embed.addFields({
        name: 'Последний матч',
        value:
          `${m.won ? '✅ Победа' : '❌ Поражение'} на **${m.heroName}**\n` +
          `KDA: ${m.kills}/${m.deaths}/${m.assists}, длительность ${m.durationMinutes} мин\n` +
          `[Матч #${m.matchId}](https://www.opendota.com/matches/${m.matchId})`,
      });
    }

    embed.setFooter({ text: 'Данные: OpenDota' });

    await interaction.editReply({ embeds: [embed] });
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
