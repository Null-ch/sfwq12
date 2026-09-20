const { buildOfflineMessage } = require('../services/presence/offlineMessages');

function createOfflineAlertJob({ config, services }) {
  const { userIds, minDays, cron, timezone } = config.offlineAlert;
  const channelId = config.notify.channelId;

  const configured = userIds.length > 0 && channelId;

  return {
    name: 'offline-alert',
    disabledReason: configured
      ? null
      : '⚠️ Уведомления об отсутствии в сети выключены: нужны OFFLINE_ALERT_USER_IDS и NOTIFY_CHANNEL_ID.',
    cron,
    timezone,
    errorMessage: 'Не удалось проверить, кого давно нет в сети:',
    startedMessage: `👻 Уведомления об отсутствии в сети запланированы (cron "${cron}", от ${minDays} дн., таймзона ${timezone}, пользователей: ${userIds.length}).`,
    async run(client) {
      services.onlineTracker.syncFromClient(client);

      const offline = services.onlineTracker.getOfflineUsers(minDays);
      if (!offline.length) return;

      const channel = await client.channels.fetch(channelId);
      await channel.send(buildOfflineMessage(offline));
    },
  };
}

module.exports = { createOfflineAlertJob };
