const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(config.discord.token);

(async () => {
  try {
    console.log(`Регистрирую ${commands.length} слэш-команд...`);

    if (config.discord.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands },
      );
      console.log(`✅ Команды зарегистрированы на сервере ${config.discord.guildId} (мгновенно).`);
    } else {
      await rest.put(Routes.applicationCommands(config.discord.clientId), { body: commands });
      console.log('✅ Команды зарегистрированы глобально (обновление может занять до часа).');
    }
  } catch (error) {
    console.error('Не удалось зарегистрировать команды:', error);
    process.exit(1);
  }
})();
