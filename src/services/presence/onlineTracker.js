const DAY_MS = 24 * 60 * 60 * 1000;

const isOnline = (presence) => Boolean(presence) && presence.status !== 'offline';

/**
 * Следит за присутствием выбранных пользователей и помнит, с какого момента каждый из них офлайн.
 * В файле состояния: userId -> null (сейчас в сети) или число мс (когда бот заметил, что пользователь ушёл).
 * Писать в файл нужно только при смене статуса, а не на каждое обновление активности.
 * Discord не отдаёт историю присутствия, поэтому отсчёт идёт с момента, когда бот впервые увидел
 * пользователя офлайн (при первом запуске - с запуска бота).
 */
function createOnlineTracker({ store, userIds, now = () => Date.now() }) {
  const tracked = new Set(userIds);

  function update(userId, online) {
    const state = store.read();
    const current = state[userId];
    if (online) {
      if (current === null) return;
      state[userId] = null;
    } else {
      if (typeof current === 'number') return;
      state[userId] = now();
    }
    store.write(state);
  }

  return {
    /** Обработчик события presenceUpdate. */
    handlePresence(presence) {
      if (!presence || !tracked.has(presence.userId)) return;
      update(presence.userId, isOnline(presence));
    },

    /**
     * Сверяет состояние с кэшем присутствия клиента: на старте бота и перед каждой проверкой,
     * чтобы не потерять изменения, пришедшие, пока бот был отключён.
     */
    syncFromClient(client) {
      for (const userId of tracked) {
        const online = client.guilds.cache.some((guild) => isOnline(guild.presences.cache.get(userId)));
        update(userId, online);
      }
    },

    /** Пользователи, которых нет в сети не меньше minDays полных суток, самые давние первыми. */
    getOfflineUsers(minDays) {
      const state = store.read();
      const current = now();
      return [...tracked]
        .filter((userId) => typeof state[userId] === 'number')
        .map((userId) => ({ userId, days: Math.floor((current - state[userId]) / DAY_MS) }))
        .filter(({ days }) => days >= minDays)
        .sort((a, b) => b.days - a.days);
    },
  };
}

module.exports = { createOnlineTracker };
