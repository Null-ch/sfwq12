// Простое хранилище "какой Discord-пользователь -> какой Dota account_id",
// т.к. Discord и Steam-аккаунты не связаны автоматически. Для личного/семейного
// бота на несколько человек JSON-файл достаточен - не нужна отдельная БД.

const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '..', '..', 'data', 'dota-links.json');

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeAll(data) {
  fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function setLink(discordUserId, accountId) {
  const data = readAll();
  data[discordUserId] = accountId;
  writeAll(data);
}

function getLink(discordUserId) {
  const data = readAll();
  return data[discordUserId] ?? null;
}

module.exports = { setLink, getLink };
