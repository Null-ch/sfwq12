const { buildDailyMessage } = require('../services/dota/dotaAlertMessages');

function createDotaAlertJob({ config, services }) {
  const { userId, accountId, minHours, cron } = config.dota.alert;
  const { timezone } = config.dota;
  const channelId = config.notify.channelId;

  const configured = userId && accountId && channelId;

  return {
    name: 'dota-alert',
    disabledReason: configured
      ? null
      : '⚠️ Напоминание о Dota выключено: нужны DOTA_ALERT_USER_ID, DOTA_ALERT_ACCOUNT_ID (или DOTA_DEFAULT_ACCOUNT_ID) и NOTIFY_CHANNEL_ID.',
    cron,
    timezone,
    errorMessage: 'Не удалось выполнить проверку игрового времени Dota 2:',
    startedMessage: `🔔 Напоминание о Dota запланировано (cron "${cron}", порог ${minHours} ч, таймзона ${timezone}).`,
    async run(client) {
      await services.dota.refreshAndWait(accountId);

      const result = await services.dotaAlert.checkTodayPlaytime(accountId, minHours);
      if (!result.hasData) {
        console.warn(`[dota-alert] у OpenDota нет данных по ${accountId} - напоминание пропущено.`);
        return;
      }

      const channel = await client.channels.fetch(channelId);
      await channel.send(buildDailyMessage(userId, result));
    },
  };
}

module.exports = { createDotaAlertJob };
