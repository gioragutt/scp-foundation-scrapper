import redis from '../lib/redis';
import { jobKey, jobWorkersStatusKey, ALL_JOB_IDS_KEY } from './redisKeys';
import * as definitionsModule from './jobDefinitions';
import { JobDefinition, startJob } from '../lib/jobs';
import { WorkerStatus } from '..//lib/jobTracking';

type JobDefinitions = { [definition: string]: JobDefinition };

const DEFINITIONS = Object.entries(definitionsModule)
  .reduce<JobDefinitions>((acc: JobDefinitions, [name, definition]) => {
    acc[name] = definition;
    return acc;
  }, {});

export interface Job {
  jobId: string;
  jobType: string;
  startTime: number;
  workerStatuses: { [workerName: string]: WorkerStatus };
  status: WorkerStatus;
}

const count = (statusCount: any, status: WorkerStatus) => statusCount[status] || 0;

const jobStatus = (workers: Job['workerStatuses']) => {
  const workerStatuses = Object.values(workers);
  const statusCount = workerStatuses.reduce((acc: any, curr) => {
    if (!acc[curr]) {
      acc[curr] = 0;
    }
    acc[curr]++;
    return acc;
  }, {});
  if (count(statusCount, WorkerStatus.PENDING) === workerStatuses.length) {
    return WorkerStatus.PENDING;
  }
  if (count(statusCount, WorkerStatus.IN_PROGRESS) !== 0) {
    return WorkerStatus.IN_PROGRESS;
  }
  if (count(statusCount, WorkerStatus.ERROR)) {
    return WorkerStatus.ERROR;
  }
  return WorkerStatus.SUCCESS;
};

export const jobById = async (jobId: string): Promise<Job> => {
  const job: Omit<Job, 'status' | 'workerStatuses'> = await redis.hgetall(jobKey(jobId));
  const workerStatuses: Job['workerStatuses'] = await redis.hgetall(jobWorkersStatusKey(jobId));
  const status = jobStatus(workerStatuses);
  return { ...job, workerStatuses, status };
};

export const allJobs = async (): Promise<Job[]> => {
  const jobIds: string[] = await redis.smembers(ALL_JOB_IDS_KEY);

  const jobs = await Promise.all(jobIds.map(jobById));
  return jobs.sort((j1, j2) => j1.startTime - j2.startTime);
};

export const createJob = async (definitionName: string, args: any): Promise<string> => {
  const definition: JobDefinition = DEFINITIONS[definitionName];
  if (!definition) {
    throw new Error(`Definition ${definitionName} doesn't exist`);
  }
  return await startJob({ definition, args });
};