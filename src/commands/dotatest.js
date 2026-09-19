// ВРЕМЕННАЯ тестовая команда для проверки напоминания о Dota. Чтобы убрать -
// удалить этот файл (команда пропадёт из Discord при следующем старте бота).
const { SlashCommandBuilder } = require('discord.js');
const { checkTodayPlaytime, buildAlertMessage } = require('../services/dotaAlert');
const { formatMinutes } = require('../services/dotaEmbed');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dotatest')
    .setDescription('[ТЕСТ] Проверить напоминание "пора играть в Dota"')
    .addStringOption((opt) =>
      opt.setName('account_id').setDescription('Dota account_id / SteamID64 (по умолчанию из настроек)'),
    )
    .addNumberOption((opt) =>
      opt.setName('min_hours').setDescription('Порог в часах (по умолчанию из настроек)').setMinValue(0),
    )
    .addUserOption((opt) => opt.setName('user').setDescription('Кого пинговать (по умолчанию из настроек или ты)'))
    .addBooleanOption((opt) => opt.setName('force').setDescription('Отправить напоминание, даже если порог не нарушен')),

  async execute(interaction) {
    const accountId = interaction.options.getString('account_id') || config.dota.alert.accountId;
    const minHours = interaction.options.getNumber('min_hours') ?? config.dota.alert.minHours;
    const userId =
      interaction.options.getUser('user')?.id || config.dota.alert.userId || interaction.user.id;
    const force = interaction.options.getBoolean('force') ?? false;

    if (!accountId) {
      return interaction.reply({
        content: '❌ Не задан account_id: укажи параметр или DOTA_ALERT_ACCOUNT_ID в .env.',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      const result = await checkTodayPlaytime(accountId, minHours);

      if (!result.hasData) {
        return interaction.editReply('⚠️ У OpenDota нет данных по этому аккаунту (профиль скрыт или неверный id).');
      }

      const summary = `Сегодня: ${result.matches} матч., ${formatMinutes(result.minutes)} (порог ${minHours} ч).`;

      if (result.low || force) {
        // Обычное сообщение в канал - ровно так же, как отправляет ежедневная задача.
        await interaction.channel.send(buildAlertMessage(userId, result.minutes));
        return interaction.editReply(`${summary} ${force && !result.low ? '(принудительно)' : ''} Напоминание отправлено.`);
      }

      return interaction.editReply(`✅ ${summary} Порог не нарушен — пинга не будет.`);
    } catch (error) {
      return interaction.editReply(`❌ ${error.message}`);
    }
  },
};
