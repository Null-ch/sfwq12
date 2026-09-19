require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { loadConfig, assertRequiredConfig } = require('./config');
const { loadCommands } = require('./core/loader');
const { createServices } = require('./services');

/** Тело запроса к Discord API: описания всех слэш-команд. */
function buildCommandsPayload(config) {
  const commands = loadCommands({ config, services: createServices(config) });
  return [...commands.values()].map((command) => command.data.toJSON());
}

async function deployCommands(config) {
  const commands = buildCommandsPayload(config);
  const rest = new REST().setToken(config.discord.token);

  console.log(`Регистрирую ${commands.length} слэш-команд...`);

  if (config.discord.guildId) {
    await rest.put(Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId), {
      body: commands,
    });
    console.log(`✅ Команды зарегистрированы на сервере ${config.discord.guildId} (мгновенно).`);
  } else {
    await rest.put(Routes.applicationCommands(config.discord.clientId), { body: commands });
    console.log('✅ Команды зарегистрированы глобально (обновление может занять до часа).');
  }
}

module.exports = { buildCommandsPayload, deployCommands };

if (require.main === module) {
  (async () => {
    await deployCommands(assertRequiredConfig(loadConfig()));
  })().catch((error) => {
    console.error('Не удалось зарегистрировать команды:', error);
    process.exit(1);
  });
}
