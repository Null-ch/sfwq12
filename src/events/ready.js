module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`✅ Бот запущен как ${client.user.tag}`);
  },
};
