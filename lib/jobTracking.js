const redis = require('./redis');

const WorkerStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
};

const JOB_ID = 'jobId';

const workersForJobTypeKey = type => `${type}-job-workers`;
const jobWorkersStatusKey = jobId => `${jobId}-job-workers-status`;

const registerWorkerForJob = async (jobType, workerName) => {
  console.log(`Registering ${workerName} for jobType='${jobType}'`);
  await redis.sadd(workersForJobTypeKey(jobType), workerName);
};

const workersForJob = async jobType => redis.smembers(workersForJobTypeKey(jobType));

const registerJob = async (jobType, jobId) => {
  const workers = await workersForJob(jobType);
  if (workers.length === 0) {
    throw new Error(`No workers registered for jobType='${jobType}'`);
  }

  const statusToSet = new Map(workers.map(worker => [worker, WorkerStatus.PENDING]));
  await redis.hmset(jobWorkersStatusKey(jobId), statusToSet);
  console.log(`Registered ${jobType} job ${jobId} with workers=${workers}`);
};

const updateWorkerStatus = async (jobId, workerName, status) => {
  console.log(`Updating ${workerName} to ${status} for job ${jobId}`);
  await redis.hset(jobWorkersStatusKey(jobId), workerName, status);
};

const updateWorkerStatusTo = status => async (jobId, workerName) => {
  await updateWorkerStatus(jobId, workerName, status);
};

const updateWorkerStarted = updateWorkerStatusTo(WorkerStatus.IN_PROGRESS);
const updateWorkerFinished = updateWorkerStatusTo(WorkerStatus.SUCCESS);
const updateWorkerFailed = updateWorkerStatusTo(WorkerStatus.ERROR);

const statusSetter = (jobId, workerName) => ({
  async start() {
    await updateWorkerStarted(jobId, workerName);
  },
  async finish() {
    await updateWorkerFinished(jobId, workerName);
  },
  async error() {
    await updateWorkerFailed(jobId, workerName);
  },
});

module.exports = {
  registerWorkerForJob,
  workersForJob,
  registerJob,
  JOB_ID,

  WorkerStatus,
  updateWorkerStarted,
  updateWorkerFinished,
  updateWorkerFailed,
  statusSetter,
};
