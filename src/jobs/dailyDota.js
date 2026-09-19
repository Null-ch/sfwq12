const { buildStatsEmbed } = require('../services/dota/dotaEmbed');

function createDailyDotaJob({ config, services }) {
  const { defaultAccountId, cron, timezone } = config.dota;

  let disabledReason = null;
  if (!defaultAccountId) {
    disabledReason = '⚠️ DOTA_DEFAULT_ACCOUNT_ID не задан — ежедневная статистика Dota 2 отключена.';
  } else if (!config.notify.channelId) {
    disabledReason = '⚠️ NOTIFY_CHANNEL_ID не задан — ежедневная статистика Dota 2 отключена.';
  }

  return {
    name: 'dota',
    disabledReason,
    cron,
    timezone,
    errorMessage: 'Не удалось отправить ежедневную статистику Dota 2:',
    startedMessage: `🎮 Ежедневная статистика Dota 2 запланирована (cron "${cron}", таймзона ${timezone}).`,
    async run(client) {
      // OpenDota обновляет матчи с задержкой - просим подтянуть свежие и немного ждём.
      await services.dota.refreshAndWait(defaultAccountId);

      const channel = await client.channels.fetch(config.notify.channelId);
      const stats = await services.dota.getPlayerSummary(defaultAccountId);
      await channel.send({ embeds: [buildStatsEmbed(stats).setTimestamp()] });
    },
  };
}

module.exports = { createDailyDotaJob };
