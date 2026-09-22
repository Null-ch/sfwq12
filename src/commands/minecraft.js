const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { buildBackupEmbed, buildClientLinkEmbed } = require('../services/minecraft/minecraftEmbed');
const { EPHEMERAL } = require('../core/ephemeral');

const NOT_CONFIGURED =
  '❌ Ссылки на Minecraft-сервер не настроены (нужны MINECRAFT_LINK_BASE_URL и MINECRAFT_LINK_TOKEN в .env).';

module.exports = ({ config, services }) => {
  const { minecraftLink } = services;

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
    return interaction.editReply({ embeds: [buildBackupEmbed(info)] });
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
    return interaction.editReply({ embeds: [buildClientLinkEmbed(info)] });
  }

  const handlers = { backup, client };

  return {
    data: new SlashCommandBuilder()
      .setName('minecraft')
      .setDescription('Бэкап и клиент-пак Minecraft-сервера')
      .addSubcommand((sub) => sub.setName('backup').setDescription('Ссылка на самый свежий бэкап мира'))
      .addSubcommand((sub) => sub.setName('client').setDescription('Скачать клиент (Forge + моды) для игры на сервере')),

    async execute(interaction) {
      if (!config.minecraft.linkBaseUrl || !config.minecraft.linkToken) {
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
