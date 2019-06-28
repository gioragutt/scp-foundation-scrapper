import { Message, Channel, ConsumeMessage } from 'amqplib';

import { createChannel, sendToTransport } from './rabbit';
import { moduleName } from './utils';
import * as jobTracking from './jobTracking';
import { Transport } from './transports';

export type RabbitMessageConsumer = (msg: ConsumeMessage) => any | Promise<any>;
export type MessageConsumer = (msg: ConsumeMessage, worker: Worker) => any | Promise<any>;
export type ConsumerCreator = (worker: Worker) => MessageConsumer;

const messageHeaders = (msg: Message): { [key: string]: any } =>
  Object.entries(msg.properties.headers)
    .filter(([key]) => !key.startsWith('x-'))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

export const getJobId = (msg: Message): string => messageHeaders(msg)[jobTracking.JOB_ID];

const wrapConsumerMethod = (worker: Worker, createConsumer: ConsumerCreator): RabbitMessageConsumer => {
  const consumer = createConsumer(worker);

  return async (msg: ConsumeMessage) => {
    const jobId = getJobId(msg);
    const { channel } = worker;

    if (!jobId) {
      console.warn(`Recieved message without ${jobTracking.JOB_ID} field. Ignoring`);
      console.warn(msg);
      channel.reject(msg);
      return;
    }

    const job = jobTracking.statusSetter(jobId, worker.workerName);
    try {
      await job.start();
      await consumer(msg, worker);
      channel.ack(msg);
      await job.finish();
    } catch (e) {
      await job.error();
      channel.reject(msg, false);
    }
  };
};

export interface WorkerOptions {
  workerName?: string;
}

export interface WorkerCreationParams {
  channel: Channel;
  transportsToInit: Transport[];
  transportToConsume: Transport;
  createConsumer: ConsumerCreator;
  options?: WorkerOptions;
}

export class Worker {
  channel: Channel;
  transportsToInit: Transport[];
  transportToConsume: Transport;
  consumer: RabbitMessageConsumer;
  consumerTag: string;
  workerName: string;
  workerTag: string;
  private initialized: boolean;

  constructor({ channel, transportsToInit, transportToConsume, createConsumer, options = {} as WorkerOptions }: WorkerCreationParams) {
    this.channel = channel;
    this.transportsToInit = transportsToInit;
    this.transportToConsume = transportToConsume;
    this.consumer = wrapConsumerMethod(this, createConsumer);
    this.consumerTag = undefined;
    this.initialized = false;
    this.workerName = options.workerName || moduleName();
    this.workerTag = `[${this.workerName}]`;
  }

  async start() {
    if (!this.initialized) {
      await this.init();
    }

    console.log(`Starting ${this.workerTag} worker for ${this.transportToConsume}`);
    const { consumerTag } = await this.channel.consume(
      this.transportToConsume.queueName,
      this.consumer
    );
    console.log(`Worker ${this.workerTag} started, consumerTag='${consumerTag}'`);
    this.consumerTag = consumerTag;
  }

  async stop() {
    if (!this.consumerTag) {
      console.warn(
        `Stop called for ${this.workerTag} worker of ${this.transportToConsume} before starting it`
      );
      return;
    }

    console.log(
      `Stopping ${this.workerTag} worker of ${this.transportToConsume}, consumerTag=${
      this.consumerTag
      }`
    );
    await this.channel.cancel(this.consumerTag);
    this.consumerTag = undefined;
    console.log(`Worker ${this.workerTag} stopped`);
  }

  async init() {
    if (this.initialized) {
      return;
    }

    const transportAssertions = this.transportsToInit.map(transport =>
      transport.init(this.channel)
    );

    await Promise.all(transportAssertions);
    await this.transportToConsume.consumptionInit(this.channel);
    await this.channel.prefetch(1);
    this.initialized = true;

    console.log(`Initialized ${this.workerTag} worker for ${this.transportToConsume}`);
  }
}

type WorkerInitializer = (worker: Worker) => (msg: ConsumeMessage) => Promise<void>;

const createWorker = async (transportsToInit: Transport[], transportToConsume: Transport, options: WorkerOptions, createConsumer: WorkerInitializer) => {
  const channel = await createChannel();
  const worker = new Worker({
    channel,
    transportsToInit,
    transportToConsume,
    createConsumer,
    options,
  });
  await worker.init();
  return worker;
};

export interface SinkWorkerParams extends WorkerOptions {
  transport: Transport;
  consumer: MessageConsumer;
}

export const createSinkWorker = ({ transport, consumer, ...options }: SinkWorkerParams) =>
  createWorker([transport], transport, options, worker => async msg => {
    try {
      await consumer(msg, worker);
    } catch (e) {
      console.error(`Processing msg from ${transport} failed`);
      console.error(`Message being processed was`, msg);
      console.error('Error caught is', e);
      throw e;
    }
  });

export interface PipeWorkerParams extends WorkerOptions {
  from: Transport;
  to: Transport;
  consumer: MessageConsumer;
}

export const createPipeWorker = ({ from, to, consumer, ...options }: PipeWorkerParams) =>
  createWorker([from, to], from, options, worker => async msg => {
    const { channel } = worker;
    try {
      const response = await consumer(msg, worker);
      if (response) {
        const headers = messageHeaders(msg);
        sendToTransport(channel, to, response, { headers });
      } else {
        console.warn(`Processing msg from ${from} returned falsy result, ignoring`);
      }
    } catch (e) {
      console.error(`Processing msg from ${from} failed, not sending to ${to}`);
      console.error(`Message being processed was`, msg);
      console.error('Error caught is', e);
      throw e;
    }
  });

export const startWorker = async (jobType: string, createWorker: () => Worker | Promise<Worker>) => {
  try {
    const worker = await createWorker();
    await jobTracking.registerWorkerForJob(jobType, worker.workerName);
    await worker.start();
  } catch (e) {
    console.error('Caught error starting worker');
    console.error(e);
    process.exit(-1);
  }
};
