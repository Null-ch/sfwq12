const { buildFreeGameEmbed } = require('../services/freeGames/freeGamesEmbed');

const EMBEDS_PER_MESSAGE = 10;

function createFreeGamesJob({ config, services }) {
  const { cron, country } = config.freeGames;

  return {
    name: 'free-games',
    disabledReason: config.notify.channelId
      ? null
      : '⚠️ NOTIFY_CHANNEL_ID не задан — автопост бесплатных раздач отключён.',
    cron,
    // Проверка сразу после запуска, чтобы не ждать первого срабатывания cron.
    runOnReady: true,
    errorMessage: 'Не удалось опубликовать бесплатные раздачи:',
    startedMessage: `🎁 Автопост бесплатных раздач запланирован (cron "${cron}", регион ${country}).`,
    async run(client) {
      const games = services.freeGamesStore.filterNew(await services.freeGames.fetchAllFreeGames());
      if (!games.length) return;

      const channel = await client.channels.fetch(config.notify.channelId);
      for (let i = 0; i < games.length; i += EMBEDS_PER_MESSAGE) {
        const chunk = games.slice(i, i + EMBEDS_PER_MESSAGE);
        await channel.send({
          content: i === 0 ? '🎁 **Новые бесплатные раздачи!**' : undefined,
          embeds: chunk.map(buildFreeGameEmbed),
        });
        // Помечаем только после успешной отправки, иначе раздача потерялась бы при сбое Discord.
        services.freeGamesStore.markPosted(chunk);
      }
    },
  };
}

module.exports = { createFreeGamesJob };
