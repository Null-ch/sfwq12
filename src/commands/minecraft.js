const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { buildBackupEmbed, buildClientLinkEmbed } = require('../services/minecraft/minecraftEmbed');
const { EPHEMERAL } = require('../core/ephemeral');

const NOT_CONFIGURED = '❌ Ссылки на Minecraft-сервер не настроены (нужен MINECRAFT_LINK_BASE_URL в .env).';

module.exports = ({ config, services }) => {
  const { minecraftLink, minecraftApplications } = services;

  /** Если задан MINECRAFT_CHANNEL_ID - команда работает только в этом канале. */
  function checkChannel(interaction) {
    const { channelId } = config.minecraft;
    if (!channelId || interaction.channelId === channelId) return true;
    return false;
  }

  async function backup(interaction) {
    await interaction.deferReply();
    const info = await minecraftLink.getBackupInfo();
    if (!info) return interaction.editReply('❌ Бэкапов пока нет — сервер `backup` ещё не успел ни одного сделать.');
    return interaction.editReply({ embeds: [buildBackupEmbed(info, config.minecraft.downloadPassword)] });
  }

  async function client(interaction) {
    await interaction.deferReply();
    const info = await minecraftLink.getClientPackInfo();
    if (!info) {
      return interaction.editReply(
        '❌ Клиент-пак ещё не собран на сервере (нужно выполнить `scripts/build-client-pack.sh` на VPS).',
      );
    }

    if (info.size != null && info.size <= config.minecraft.clientAttachMaxBytes) {
      const buffer = await minecraftLink.fetchClientPack();
      const attachment = new AttachmentBuilder(buffer, { name: 'minecraft-client-pack.zip' });
      return interaction.editReply({
        content: '📦 Клиент-пак (Forge + моды + инструкция в README.txt внутри архива):',
        files: [attachment],
      });
    }

    // Слишком большой для вложения (или размер неизвестен) - просто ссылка.
    return interaction.editReply({ embeds: [buildClientLinkEmbed(info, config.minecraft.downloadPassword)] });
  }

  async function apply(interaction) {
    await interaction.deferReply(EPHEMERAL);
    if (!minecraftApplications.api.configured || !config.minecraft.approverIds.length) {
      return interaction.editReply(
        '❌ Заявки не настроены (нужны MINECRAFT_API_TOKEN и MINECRAFT_APPROVER_IDS в .env бота).',
      );
    }

    const app = await minecraftApplications.api.create({
      nickname: interaction.options.getString('nick', true),
      comment: interaction.options.getString('comment') ?? '',
      discordUserId: interaction.user.id,
      discordTag: interaction.user.username,
    });
    // Не ждём крона: одобряющие получают заявку сразу.
    await minecraftApplications.review.notifyNew(interaction.client).catch((error) => {
      console.error('Не удалось сразу разослать заявку одобряющим:', error);
    });
    return interaction.editReply(
      `📨 Заявка на ник \`${app.nickname}\` отправлена. Когда её рассмотрят, бот напишет тебе в личку.`,
    );
  }

  const handlers = { backup, client, apply };

  return {
    data: new SlashCommandBuilder()
      .setName('minecraft')
      .setDescription('Бэкап, клиент-пак и заявка на игру на Minecraft-сервере')
      .addSubcommand((sub) => sub.setName('backup').setDescription('Ссылка на самый свежий бэкап мира'))
      .addSubcommand((sub) => sub.setName('client').setDescription('Скачать клиент (Forge + моды) для игры на сервере'))
      .addSubcommand((sub) =>
        sub
          .setName('apply')
          .setDescription('Подать заявку на игру (добавление в whitelist)')
          .addStringOption((opt) =>
            opt
              .setName('nick')
              .setDescription('Ник в Minecraft - точно как в лаунчере, с учётом регистра')
              .setRequired(true)
              .setMinLength(3)
              .setMaxLength(16),
          )
          .addStringOption((opt) => opt.setName('comment').setDescription('Комментарий для администратора').setMaxLength(200)),
      ),

    async execute(interaction) {
      if (!config.minecraft.linkBaseUrl) {
        return interaction.reply({ content: NOT_CONFIGURED, ...EPHEMERAL });
      }
      if (!checkChannel(interaction)) {
        return interaction.reply({
          content: `❌ Эта команда работает только в <#${config.minecraft.channelId}>.`,
          ...EPHEMERAL,
        });
      }
      try {
        return await handlers[interaction.options.getSubcommand()](interaction);
      } catch (error) {
        return interaction.editReply(`❌ ${error.message}`);
      }
    },
  };
};
