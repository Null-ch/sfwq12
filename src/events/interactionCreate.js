const { isMusicButton, handleMusicButton } = require('../music/controls');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (isMusicButton(interaction)) {
      try {
        await handleMusicButton(interaction);
      } catch (error) {
        console.error('Ошибка кнопки музыки:', error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Не получилось выполнить действие.', ephemeral: true }).catch(() => {});
        }
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Ошибка выполнения команды /${interaction.commandName}:`, error);
      const payload = { content: '❌ Произошла ошибка при выполнении команды.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  },
};
