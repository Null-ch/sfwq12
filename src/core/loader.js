const fs = require('fs');
const path = require('path');

const COMMANDS_DIR = path.join(__dirname, '..', 'commands');
const EVENTS_DIR = path.join(__dirname, '..', 'events');

/** Подключает все .js-модули каталога (по алфавиту) и возвращает то, что они экспортируют. */
function loadModules(dir) {
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.js'))
    .sort()
    .map((file) => require(path.join(dir, file)));
}

/**
 * Каждый файл в commands/ экспортирует фабрику (ctx) => ({ data, execute }).
 * Чтобы добавить команду, достаточно положить новый файл - править другие модули не нужно.
 */
function loadCommands(ctx, dir = COMMANDS_DIR) {
  const commands = new Map();
  for (const createCommand of loadModules(dir)) {
    const command = createCommand(ctx);
    const name = command?.data?.name;
    if (!name || typeof command.execute !== 'function') {
      throw new Error(`Некорректный модуль команды в ${dir}: нужны data и execute.`);
    }
    if (commands.has(name)) {
      throw new Error(`Команда /${name} объявлена дважды.`);
    }
    commands.set(name, command);
  }
  return commands;
}

/** Каждый файл в events/ экспортирует { name, once?, execute } - событие клиента discord.js. */
function loadEvents(dir = EVENTS_DIR) {
  return loadModules(dir);
}

module.exports = { loadModules, loadCommands, loadEvents };
