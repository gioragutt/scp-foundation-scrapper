import redis from './redis';
import { sendSystemEvent, JobStarted, WorkerStatusUpdate } from './systemEvents';

export enum WorkerStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export const JOB_ID = 'jobId';

const workersForJobTypeKey = (type: string) => `${type}-job-workers`;

export const workersForJob = async (jobType: string) => redis.smembers(workersForJobTypeKey(jobType));

export const registerJob = async (jobType: string, jobId: string) => {
  const workers = await workersForJob(jobType);
  if (workers.length === 0) {
    throw new Error(`No workers registered for jobType='${jobType}'`);
  }

  await sendSystemEvent(new JobStarted(jobId, jobType, workers));
};

const updateWorkerStatusTo = (status: WorkerStatus) => async (jobId: string, workerName: string) => {
  await sendSystemEvent(new WorkerStatusUpdate(jobId, workerName, status));
};

export const updateWorkerStarted = updateWorkerStatusTo(WorkerStatus.IN_PROGRESS);
export const updateWorkerFinished = updateWorkerStatusTo(WorkerStatus.SUCCESS);
export const updateWorkerFailed = updateWorkerStatusTo(WorkerStatus.ERROR);
