import redis from './redis';

export enum WorkerStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export const JOB_ID = 'jobId';

const workersForJobTypeKey = (type: string) => `${type}-job-workers`;
const jobWorkersStatusKey = (jobId: string) => `${jobId}-job-workers-status`;

export const registerWorkerForJob = async (jobType: string, workerName: string) => {
  console.log(`Registering ${workerName} for jobType='${jobType}'`);
  await redis.sadd(workersForJobTypeKey(jobType), workerName);
};

export const workersForJob = async (jobType: string) => redis.smembers(workersForJobTypeKey(jobType));

export const registerJob = async (jobType: string, jobId: string) => {
  const workers = await workersForJob(jobType);
  if (workers.length === 0) {
    throw new Error(`No workers registered for jobType='${jobType}'`);
  }

  const statusToSet = new Map(workers.map((worker: any) => [worker, WorkerStatus.PENDING]));
  await redis.hmset(jobWorkersStatusKey(jobId), statusToSet);
  console.log(`Registered ${jobType} job ${jobId} with workers=${workers}`);
};

const updateWorkerStatus = async (jobId: string, workerName: string, status: WorkerStatus) => {
  console.log(`Updating ${workerName} to ${status} for job ${jobId}`);
  await redis.hset(jobWorkersStatusKey(jobId), workerName, status);
};

const updateWorkerStatusTo = (status: WorkerStatus) => async (jobId: string, workerName: string) => {
  await updateWorkerStatus(jobId, workerName, status);
};

const updateWorkerStarted = updateWorkerStatusTo(WorkerStatus.IN_PROGRESS);
const updateWorkerFinished = updateWorkerStatusTo(WorkerStatus.SUCCESS);
const updateWorkerFailed = updateWorkerStatusTo(WorkerStatus.ERROR);

export const statusSetter = (jobId: string, workerName: string) => ({
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
