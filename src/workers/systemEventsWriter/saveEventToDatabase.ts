import {
  SystemEvent,
  SystemEventType,
  JobStarted,
  WorkerStarted,
  WorkerStatusUpdate,
} from '../../lib/systemEvents';
import redis from '../../lib/redis';
import { WorkerStatus } from '../../lib/jobTracking';
import {
  jobWorkersStatusKey,
  jobKey,
  workersForJobTypeKey,
  ALL_JOB_IDS_KEY,
} from '../../api/redisKeys';

async function jobStarted({ jobId, jobType, workers, timestamp: startTime }: JobStarted) {
  const pipeline = redis.pipeline();
  const statusToSet = new Map(workers.map((worker: any) => [worker, WorkerStatus.PENDING]));
  pipeline.sadd(ALL_JOB_IDS_KEY, jobId);
  pipeline.hmset(jobWorkersStatusKey(jobId), statusToSet);
  pipeline.hmset(jobKey(jobId), { jobId, jobType, startTime });
  await pipeline.exec();
  console.log(`Registered ${jobType} job ${jobId} with workers=${workers}`);
}

async function workerStarted({ jobType, workerName }: WorkerStarted) {
  console.log(`Registering ${workerName} for jobType='${jobType}'`);
  await redis.sadd(workersForJobTypeKey(jobType), workerName);
}

async function updateWorkerStatusTo({ jobId, workerName, status }: WorkerStatusUpdate) {
  console.log(`Updating ${workerName} to ${status} for job ${jobId}`);
  await redis.hset(jobWorkersStatusKey(jobId), workerName, status);
}

export async function saveEventToDatabase(event: SystemEvent) {
  switch (event.type) {
    case SystemEventType.JobStarted:
      await jobStarted(event);
      break;
    case SystemEventType.WorkerStarted:
      await workerStarted(event);
      break;
    case SystemEventType.WorkerStatusUpdate:
      await updateWorkerStatusTo(event);
      break;
  }
}
