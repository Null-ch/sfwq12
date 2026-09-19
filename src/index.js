require('dotenv').config();

const { loadConfig, assertRequiredConfig } = require('./config');
const { createApp } = require('./app');

(async () => {
  const config = assertRequiredConfig(loadConfig());
  await createApp(config).start();
})().catch((error) => {
  console.error('Не удалось запустить бота:', error);
  process.exit(1);
});
