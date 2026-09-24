const { registerJob } = require('./scheduler');
const { createDailyWeatherJob } = require('./dailyWeather');
const { createDailyDotaJob } = require('./dailyDota');
const { createDotaAlertJob } = require('./dailyDotaAlert');
const { createFreeGamesJob } = require('./freeGames');
const { createMinecraftApplicationsJob } = require('./minecraftApplications');

// Чтобы добавить фоновую задачу, достаточно описать её фабрикой и дописать сюда.
const JOB_FACTORIES = [
  createDailyWeatherJob,
  createDailyDotaJob,
  createDotaAlertJob,
  createFreeGamesJob,
  createMinecraftApplicationsJob,
];

function createJobs(ctx) {
  return JOB_FACTORIES.map((createJob) => createJob(ctx));
}

function scheduleJobs(client, ctx) {
  for (const job of createJobs(ctx)) registerJob(client, job);
}

module.exports = { createJobs, scheduleJobs };
