const musicButtons = require('../music/buttons');
const { EPHEMERAL } = require('../core/ephemeral');

// Обработчики кнопок: { matches(interaction), handle(interaction), errorLabel }.
// Новая группа кнопок подключается добавлением сюда одного модуля.
const buttonHandlers = [musicButtons];

async function handleButton(interaction, handler) {
  try {
    await handler.handle(interaction);
  } catch (error) {
    console.error(handler.errorLabel, error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Не получилось выполнить действие.', ...EPHEMERAL }).catch(() => {});
    }
  }
}

async function handleCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Ошибка выполнения команды /${interaction.commandName}:`, error);
    const content = '❌ Произошла ошибка при выполнении команды.';
    if (interaction.deferred || interaction.replied) {
      // Видимость уже отправленного ответа изменить нельзя, поэтому ephemeral здесь не нужен.
      await interaction.editReply({ content }).catch(() => {});
    } else {
      await interaction.reply({ content, ...EPHEMERAL }).catch(() => {});
    }
  }
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    const buttonHandler = buttonHandlers.find((handler) => handler.matches(interaction));
    if (buttonHandler) return handleButton(interaction, buttonHandler);

    if (!interaction.isChatInputCommand()) return;
    return handleCommand(interaction);
  },
};
