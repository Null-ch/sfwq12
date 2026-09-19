const cron = require('node-cron');
const { getPlayerSummary, requestRefresh } = require('../services/dotaService');
const { buildStatsEmbed } = require('../services/dotaEmbed');
const config = require('../config');

const REFRESH_WAIT_MS = 15_000;

function scheduleDailyDota(client) {
  if (!config.dota.defaultAccountId) {
    console.warn('⚠️ DOTA_DEFAULT_ACCOUNT_ID не задан — ежедневная статистика Dota 2 отключена.');
    return;
  }
  if (!config.notify.channelId) {
    console.warn('⚠️ NOTIFY_CHANNEL_ID не задан — ежедневная статистика Dota 2 отключена.');
    return;
  }

  cron.schedule(
    config.dota.cron,
    async () => {
      try {
        // OpenDota обновляет матчи с задержкой - просим подтянуть свежие и немного ждём.
        await requestRefresh(config.dota.defaultAccountId);
        await new Promise((resolve) => setTimeout(resolve, REFRESH_WAIT_MS));

        const channel = await client.channels.fetch(config.notify.channelId);
        const stats = await getPlayerSummary(config.dota.defaultAccountId);
        await channel.send({ embeds: [buildStatsEmbed(stats).setTimestamp()] });
      } catch (error) {
        console.error('Не удалось отправить ежедневную статистику Dota 2:', error);
      }
    },
    { timezone: config.dota.timezone },
  );

  console.log(
    `🎮 Ежедневная статистика Dota 2 запланирована (cron "${config.dota.cron}", таймзона ${config.dota.timezone}).`,
  );
}

module.exports = { scheduleDailyDota };
