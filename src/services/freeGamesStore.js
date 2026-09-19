// Запоминает, какие раздачи уже отправлены, чтобы не постить их повторно.
const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '..', '..', 'data', 'free-games.json');
const KEEP_MS = 90 * 24 * 60 * 60 * 1000;

function read() {
  try {
    return JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function filterNew(games) {
  const posted = read();
  return games.filter((g) => !posted[g.id]);
}

function markPosted(games) {
  const now = Date.now();
  const posted = read();
  for (const g of games) posted[g.id] = now;

  for (const [id, ts] of Object.entries(posted)) {
    if (now - ts > KEEP_MS) delete posted[id];
  }

  fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(posted, null, 2), 'utf8');
}

module.exports = { filterNew, markPosted };
