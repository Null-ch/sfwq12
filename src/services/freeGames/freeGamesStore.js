// Запоминает, какие раздачи уже отправлены, чтобы не постить их повторно.

const KEEP_MS = 90 * 24 * 60 * 60 * 1000;

function createFreeGamesStore(store, { now = () => Date.now() } = {}) {
  return {
    filterNew(games) {
      const posted = store.read();
      return games.filter((g) => !posted[g.id]);
    },

    markPosted(games) {
      const timestamp = now();
      const posted = store.read();
      for (const g of games) posted[g.id] = timestamp;

      for (const [id, ts] of Object.entries(posted)) {
        if (timestamp - ts > KEEP_MS) delete posted[id];
      }

      store.write(posted);
    },
  };
}

module.exports = { createFreeGamesStore };
