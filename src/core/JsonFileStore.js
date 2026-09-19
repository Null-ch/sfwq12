const fs = require('fs');
const path = require('path');

/**
 * Хранилище одного JSON-объекта в файле. Для личного бота на несколько человек
 * этого достаточно - отдельная БД не нужна. Битый или отсутствующий файл читается как пустой объект.
 */
function createJsonFileStore(filePath) {
  return {
    read() {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch {
        return {};
      }
    },
    write(data) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    },
  };
}

module.exports = { createJsonFileStore };
