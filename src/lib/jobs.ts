import { Channel } from 'amqplib';
import { createChannel, sendToTransport } from './rabbit';
import { JOB_ID, registerJob } from './jobTracking';
import uuid from 'uuid';
import { Transport } from './transports';

export interface JobDefinition {
  jobType: string;
  transport: Transport;
  requiredArgs?: string[];
}

export const createJobDefinition = (
  jobType: string,
  transport: Transport,
  requiredArgs: string[] = []
): JobDefinition => ({
  jobType,
  transport,
  requiredArgs,
});

const validateJobArguments = (requiredArgs: string[], args: string[] | object): void | never => {
  if (!requiredArgs || requiredArgs.length === 0) {
    return;
  }

  if (typeof args !== 'object') {
    return;
  }

  requiredArgs.forEach(arg => {
    if (!(arg in args)) {
      throw new Error(`Missing required argument ${arg} in ${JSON.stringify(args)}`);
    }
  });
};

export interface StartJobParams<T = any> {
  channel?: Channel;
  definition: JobDefinition;
  args: T;
  headers?: { [header: string]: string };
}

export async function startJob({
  channel,
  definition: { jobType, transport, requiredArgs },
  args = {},
  headers = {},
}: StartJobParams): Promise<string> {
  validateJobArguments(requiredArgs, args);

  if (!channel) {
    channel = await createChannel();
  }

  const jobId = uuid();
  await transport.init(channel);
  await registerJob(jobType, jobId);

  console.log(`Starting ${jobType} job ${jobId}`);
  console.log('Parameters:', args);
  if (headers && Object.keys(headers).length > 0) {
    console.log('Headers:', headers);
  }

  sendToTransport(channel, transport, args, {
    headers: {
      ...headers,
      [JOB_ID]: jobId,
    },
  });
  return jobId;
}
