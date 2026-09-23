const { EPHEMERAL } = require('../../core/ephemeral');
const { APPLICATION_BUTTON_PREFIX, buildApplicationMessage } = require('./applicationEmbed');

/**
 * Рассмотрение заявок на игру: рассылка новых заявок в личку всем одобряющим и
 * обработка кнопок "Одобрить/Отклонить". Решает тот, кто нажал первым, - сообщения
 * у остальных обновляются до итогового статуса. Какие сообщения к какой заявке
 * отправлены, хранится в store ({ [id заявки]: [{ channelId, messageId }] }), чтобы
 * не слать заявку повторно после перезапуска бота.
 */
function createApplicationReview({ applications, store, approverIds }) {
  let polling = false;

  async function sendToApprovers(client, app) {
    const refs = [];
    for (const userId of approverIds) {
      try {
        const user = await client.users.fetch(userId);
        const message = await user.send(buildApplicationMessage(app));
        refs.push({ channelId: message.channelId, messageId: message.id });
      } catch (error) {
        // Закрытая личка или неверный ID - остальные одобряющие заявку всё равно получат.
        console.error(`Не удалось отправить заявку ${app.nickname} одобряющему ${userId}:`, error.message);
      }
    }
    return refs;
  }

  /** Раз в MINECRAFT_APPLICATIONS_CRON: новые заявки -> в личку одобряющим. */
  async function notifyNew(client) {
    // Запуски по крону могут наложиться, если link-server отвечает медленно.
    if (polling) return;
    polling = true;
    try {
      const pending = await applications.listPending();
      const sent = store.read();
      for (const app of pending) {
        if (sent[app.id]) continue;
        sent[app.id] = await sendToApprovers(client, app);
        store.write(sent);
      }
      // Заявки, решённые не через бота, больше не отслеживаем; кнопка в старом
      // сообщении всё равно корректно покажет итог (link-server вернёт 409).
      const pendingIds = new Set(pending.map((app) => app.id));
      const stale = Object.keys(sent).filter((id) => !pendingIds.has(id));
      if (stale.length) {
        for (const id of stale) delete sent[id];
        store.write(sent);
      }
    } finally {
      polling = false;
    }
  }

  async function updateMessages(client, app, skipMessageId) {
    const refs = store.read()[app.id] ?? [];
    for (const { channelId, messageId } of refs) {
      if (messageId === skipMessageId) continue;
      try {
        const channel = await client.channels.fetch(channelId);
        await channel.messages.edit(messageId, buildApplicationMessage(app));
      } catch (error) {
        console.error(`Не удалось обновить сообщение с заявкой ${app.nickname}:`, error.message);
      }
    }
  }

  async function notifyApplicant(client, app) {
    if (!app.discordUserId) return;
    const text =
      app.status === 'approved'
        ? `✅ Твоя заявка на Minecraft-сервер одобрена — ник \`${app.nickname}\` добавлен в whitelist, можно заходить!`
        : `❌ Твоя заявка на Minecraft-сервер (ник \`${app.nickname}\`) отклонена.`;
    try {
      const user = await client.users.fetch(app.discordUserId);
      await user.send(text);
    } catch (error) {
      console.error(`Не удалось сообщить ${app.discordUserId} о решении по заявке:`, error.message);
    }
  }

  function matches(interaction) {
    return interaction.isButton() && interaction.customId.startsWith(APPLICATION_BUTTON_PREFIX);
  }

  async function handleButton(interaction) {
    if (!approverIds.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ Рассматривать заявки могут только одобряющие.', ...EPHEMERAL });
    }

    const [action, id] = interaction.customId.slice(APPLICATION_BUTTON_PREFIX.length).split(':');
    // Одобрение ходит в RCON и может занять пару секунд - дольше, чем Discord ждёт ответа.
    await interaction.deferUpdate();

    let app;
    let decidedNow = true;
    try {
      app = await applications.decide(id, action, interaction.user.username);
    } catch (error) {
      if (error.status !== 409 || !error.application) {
        return interaction.followUp({ content: `❌ ${error.message}`, ...EPHEMERAL });
      }
      app = error.application;
      decidedNow = false;
    }

    await interaction.editReply(buildApplicationMessage(app));
    await updateMessages(interaction.client, app, interaction.message.id);

    const sent = store.read();
    delete sent[app.id];
    store.write(sent);

    if (decidedNow) await notifyApplicant(interaction.client, app);
    else await interaction.followUp({ content: 'ℹ️ Эту заявку уже рассмотрели.', ...EPHEMERAL });
  }

  return {
    notifyNew,
    buttons: { errorLabel: 'Ошибка кнопки заявки Minecraft:', matches, handle: handleButton },
  };
}

module.exports = { createApplicationReview };
