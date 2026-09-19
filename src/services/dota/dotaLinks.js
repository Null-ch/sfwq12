// "Какой Discord-пользователь -> какой Dota account_id": Discord и Steam-аккаунты
// не связаны автоматически, поэтому привязку хранит сам бот.

function createDotaLinks(store) {
  return {
    setLink(discordUserId, accountId) {
      const data = store.read();
      data[discordUserId] = accountId;
      store.write(data);
    },
    getLink(discordUserId) {
      return store.read()[discordUserId] ?? null;
    },
  };
}

module.exports = { createDotaLinks };
