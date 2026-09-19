const { useQueue } = require('discord-player');
const { EPHEMERAL } = require('../core/ephemeral');

/**
 * Шаблон команд, работающих с очередью сервера: находит очередь, отвечает
 * "нечего делать" если её нет, и только потом вызывает run(interaction, queue).
 *
 * requireTrack: true - команда имеет смысл, только когда что-то играет;
 *               false - достаточно самой очереди (например, /stop или /volume).
 * getQueue вынесен в параметр, чтобы команды можно было проверить без живого Discord.
 */
function createQueueCommand({ data, emptyMessage, requireTrack = true, run, getQueue = useQueue }) {
  return {
    data,
    async execute(interaction) {
      const queue = getQueue(interaction.guild.id);
      if (!queue || (requireTrack && !queue.currentTrack)) {
        return interaction.reply({ content: emptyMessage, ...EPHEMERAL });
      }
      return run(interaction, queue);
    },
  };
}

module.exports = { createQueueCommand };
