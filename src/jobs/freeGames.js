const cron = require('node-cron');
const { fetchAllFreeGames } = require('../services/freeGamesService');
const { filterNew, markPosted } = require('../services/freeGamesStore');
const { buildFreeGameEmbed } = require('../services/freeGamesEmbed');
const config = require('../config');

const EMBEDS_PER_MESSAGE = 10;

async function postNewFreeGames(client) {
  const games = filterNew(await fetchAllFreeGames());
  if (!games.length) return;

  const channel = await client.channels.fetch(config.notify.channelId);
  for (let i = 0; i < games.length; i += EMBEDS_PER_MESSAGE) {
    const chunk = games.slice(i, i + EMBEDS_PER_MESSAGE);
    await channel.send({
      content: i === 0 ? '🎁 **Новые бесплатные раздачи!**' : undefined,
      embeds: chunk.map(buildFreeGameEmbed),
    });
    // Помечаем только после успешной отправки, иначе раздача потерялась бы при сбое Discord.
    markPosted(chunk);
  }
}

function scheduleFreeGames(client) {
  if (!config.notify.channelId) {
    console.warn('⚠️ NOTIFY_CHANNEL_ID не задан — автопост бесплатных раздач отключён.');
    return;
  }

  const run = () =>
    postNewFreeGames(client).catch((error) => console.error('Не удалось опубликовать бесплатные раздачи:', error));

  cron.schedule(config.freeGames.cron, run);
  // Проверка сразу после запуска, чтобы не ждать первого срабатывания cron.
  client.once('clientReady', run);

  console.log(
    `🎁 Автопост бесплатных раздач запланирован (cron "${config.freeGames.cron}", регион ${config.freeGames.country}).`,
  );
}

module.exports = { scheduleFreeGames, postNewFreeGames };
