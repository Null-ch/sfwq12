const { MessageFlags } = require('discord.js');

// Ответ виден только тому, кто вызвал команду. Раскрывается в опции reply(): { content, ...EPHEMERAL }.
const EPHEMERAL = { flags: MessageFlags.Ephemeral };

module.exports = { EPHEMERAL };
