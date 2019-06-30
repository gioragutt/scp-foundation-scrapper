import redis from './redis';
import { sendSystemEvent, JobStarted, WorkerStatusUpdate } from './systemEvents';

export enum WorkerStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export const JOB_ID = 'jobId';

const jobKey = (jobId: string) => `${jobId}-job`;
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

  const pipeline = redis.pipeline();
  const statusToSet = new Map(workers.map((worker: any) => [worker, WorkerStatus.PENDING]));
  pipeline.hmset(jobWorkersStatusKey(jobId), statusToSet);
  pipeline.hmset(jobKey(jobId), { jobId, jobType });
  await pipeline.exec();
  console.log(`Registered ${jobType} job ${jobId} with workers=${workers}`);

  await sendSystemEvent(new JobStarted(jobId, jobType, workers));
};

const updateWorkerStatusTo = (status: WorkerStatus) => async (jobId: string, workerName: string) => {
  console.log(`Updating ${workerName} to ${status} for job ${jobId}`);
  await redis.hset(jobWorkersStatusKey(jobId), workerName, status);
  await sendSystemEvent(new WorkerStatusUpdate(jobId, workerName, status));
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
