function createMinecraftApplicationsJob({ config, services }) {
  const { applicationsCron: cron, approverIds } = config.minecraft;
  const { api, review } = services.minecraftApplications;

  const configured = api.configured && approverIds.length > 0;

  // Опрос идёт каждые 30 секунд: пока link-server недоступен, пишем в лог только
  // начало и конец сбоя, а не стектрейс на каждый запуск.
  let failing = false;
  async function run(client) {
    try {
      await review.notifyNew(client);
    } catch (error) {
      if (!failing) {
        console.error('Не удалось забрать заявки на Minecraft-сервер:', error);
        console.warn('⚠️ Повторные ошибки опроса заявок не логируются до восстановления связи.');
      }
      failing = true;
      return;
    }
    if (failing) console.log('✅ Связь с link-server восстановлена, заявки снова забираются.');
    failing = false;
  }

  return {
    name: 'minecraft-applications',
    disabledReason: configured
      ? null
      : '⚠️ Заявки на Minecraft-сервер выключены: нужны MINECRAFT_LINK_BASE_URL, MINECRAFT_API_TOKEN и MINECRAFT_APPROVER_IDS.',
    cron,
    runOnReady: true,
    errorMessage: 'Не удалось забрать заявки на Minecraft-сервер:',
    startedMessage: `🎮 Заявки на Minecraft-сервер: проверка по cron "${cron}", одобряющих: ${approverIds.length}.`,
    run,
  };
}

module.exports = { createMinecraftApplicationsJob };
