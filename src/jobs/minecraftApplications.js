function createMinecraftApplicationsJob({ config, services }) {
  const { applicationsCron: cron, approverIds } = config.minecraft;
  const { api, review } = services.minecraftApplications;

  const configured = api.configured && approverIds.length > 0;

  return {
    name: 'minecraft-applications',
    disabledReason: configured
      ? null
      : '⚠️ Заявки на Minecraft-сервер выключены: нужны MINECRAFT_LINK_BASE_URL, MINECRAFT_API_TOKEN и MINECRAFT_APPROVER_IDS.',
    cron,
    runOnReady: true,
    errorMessage: 'Не удалось забрать заявки на Minecraft-сервер:',
    startedMessage: `🎮 Заявки на Minecraft-сервер: проверка по cron "${cron}", одобряющих: ${approverIds.length}.`,
    run: (client) => review.notifyNew(client),
  };
}

module.exports = { createMinecraftApplicationsJob };
