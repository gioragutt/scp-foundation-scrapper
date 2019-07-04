import { createJobDefinition } from '../lib/jobs';
import { BEGIN_PROCESSING_SCP } from './transports';
import redis from '../lib/redis';
import { jobKey } from './redisKeys';

export const PROCESS_SCP = createJobDefinition('PROCESS_SCP', BEGIN_PROCESSING_SCP);

export interface Job {
  jobId: string;
  jobType: string;
}

export const jobById = async (jobId: string): Promise<Job> => redis.hgetall(jobKey(jobId));

export const allJobs = async (): Promise<Job[]> => {
  const jobKeys = (await redis.keys(jobKey('*')));

  const pipeline = redis.pipeline();
  jobKeys.forEach(key => pipeline.hgetall(key));
  const jobs = await pipeline.exec();
  return jobs.map(([_, job]: [Error, Job]) => job);
};