const cron = require('node-cron');

/**
 * Регистрирует фоновую задачу по её описанию:
 *   name            - для логов
 *   disabledReason  - если задан, задача не запускается, а причина пишется в предупреждение
 *   cron, timezone  - расписание (timezone необязателен)
 *   runOnReady      - дополнительно выполнить один раз сразу после подключения бота
 *   startedMessage  - строка для лога об успешном планировании
 *   errorMessage    - префикс сообщения, если очередной запуск упал
 *   run(client)     - сама работа
 * Ошибка запуска только логируется и не влияет на следующие срабатывания.
 * Возвращает true, если задача запланирована.
 */
function registerJob(client, job, { scheduler = cron } = {}) {
  if (job.disabledReason) {
    console.warn(job.disabledReason);
    return false;
  }

  const task = async () => {
    try {
      await job.run(client);
    } catch (error) {
      console.error(job.errorMessage, error);
    }
  };

  scheduler.schedule(job.cron, task, job.timezone ? { timezone: job.timezone } : undefined);
  if (job.runOnReady) client.once('clientReady', task);

  console.log(job.startedMessage);
  return true;
}

module.exports = { registerJob };
