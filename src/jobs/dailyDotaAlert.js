const cron = require('node-cron');
const { requestRefresh } = require('../services/dotaService');
const { checkTodayPlaytime, buildDailyMessage } = require('../services/dotaAlert');
const config = require('../config');

const REFRESH_WAIT_MS = 15_000;

function scheduleDotaAlert(client) {
  const { userId, accountId, minHours, cron: expression } = config.dota.alert;
  const channelId = config.notify.channelId;

  if (!userId || !accountId || !channelId) {
    console.warn(
      '⚠️ Напоминание о Dota выключено: нужны DOTA_ALERT_USER_ID, DOTA_ALERT_ACCOUNT_ID (или DOTA_DEFAULT_ACCOUNT_ID) и NOTIFY_CHANNEL_ID.',
    );
    return;
  }

  cron.schedule(
    expression,
    async () => {
      try {
        await requestRefresh(accountId);
        await new Promise((resolve) => setTimeout(resolve, REFRESH_WAIT_MS));

        const result = await checkTodayPlaytime(accountId, minHours);
        if (!result.hasData) {
          console.warn(`[dota-alert] у OpenDota нет данных по ${accountId} - напоминание пропущено.`);
          return;
        }

        const channel = await client.channels.fetch(channelId);
        await channel.send(buildDailyMessage(userId, result));
      } catch (error) {
        console.error('Не удалось выполнить проверку игрового времени Dota 2:', error);
      }
    },
    { timezone: config.dota.timezone },
  );

  console.log(
    `🔔 Напоминание о Dota запланировано (cron "${expression}", порог ${minHours} ч, таймзона ${config.dota.timezone}).`,
  );
}

module.exports = { scheduleDotaAlert };
