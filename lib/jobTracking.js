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
  await redis.sadd(workersForJobTypeKey(jobType), workerName);
};

const workersForJob = async jobType => redis.smembers(workersForJobTypeKey(jobType));

const registerJob = async (jobType, jobId) => {
  const workers = await workersForJob(jobType);
  if (workers.length === 0) {
    throw new Error(`No workers registered for jobType='${jobType}'`);
  }

  const statusToSet = new Map(workers.map(worker => [worker, true]));
  await redis.hmset(jobWorkersStatusKey(jobId), statusToSet);
};

const updateWorkerStatus = async (jobId, workerName, status) => {
  await redis.hset(jobWorkersStatusKey(jobId), workerName, status);
};

module.exports = {
  registerWorkerForJob,
  workersForJob,
  registerJob,
  updateWorkerStatus,
  JOB_ID,
  WorkerStatus,
};
