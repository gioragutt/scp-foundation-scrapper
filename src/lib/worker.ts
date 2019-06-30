import { Message, Channel, ConsumeMessage } from 'amqplib';

import { createChannel, sendToTransport, messageHeaders } from './rabbit';
import { moduleName } from './utils';
import * as jobTracking from './jobTracking';
import { Transport } from './transports';
import { sendSystemEvent, WorkerStarted } from './systemEvents';

export type RabbitMessageConsumer = (msg: ConsumeMessage) => any | Promise<any>;
export type MessageConsumer = (msg: ConsumeMessage, worker: Worker) => any | Promise<any>;
export type ConsumerCreator = (worker: Worker) => MessageConsumer;

export const getJobId = (msg: Message): string => messageHeaders(msg)[jobTracking.JOB_ID];

export interface WorkerOptions {
  workerName?: string;
}

export interface WorkerCreationParams {
  channel?: Channel;
  transportsToInit: Transport[];
  transportToConsume: Transport;
  messageConsumer: MessageConsumer;
  options?: WorkerOptions;
}

export class Worker {
  channel: Channel;
  transportsToInit: Transport[];
  transportToConsume: Transport;
  messageConsumer: MessageConsumer;
  consumerTag: string;
  workerName: string;
  workerTag: string;
  private initialized: boolean;

  constructor({ channel, transportsToInit, transportToConsume, messageConsumer, options = {} as WorkerOptions }: WorkerCreationParams) {
    this.channel = channel;
    this.transportsToInit = transportsToInit;
    this.transportToConsume = transportToConsume;
    this.messageConsumer = messageConsumer;
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
      this.consume.bind(this)
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

  async consume(msg: ConsumeMessage) {
    const { channel } = this;

    try {
      await this.beforeAcceptingMessage(msg);
    } catch (e) {
      console.warn('Ignoring message due to', e);
      channel.reject(msg);
      return;
    }

    try {
      await this.messageConsumer(msg, this);
      channel.ack(msg);
      await this.afterAcceptingMessage(msg);
    } catch (e) {
      channel.reject(msg, false);
      await this.onAcceptingError(msg);
    }
  }

  async beforeAcceptingMessage(msg: ConsumeMessage) {
    const jobId = getJobId(msg);
    if (!jobId) {
      throw new Error(`Message without ${jobTracking.JOB_ID} field`);
    }
    await jobTracking.updateWorkerStarted(jobId, this.workerName);
  }

  async afterAcceptingMessage(msg: ConsumeMessage) {
    const jobId = getJobId(msg);
    await jobTracking.updateWorkerFinished(jobId, this.workerName);
  }

  async onAcceptingError(msg: ConsumeMessage) {
    const jobId = getJobId(msg);
    await jobTracking.updateWorkerFailed(jobId, this.workerName);
  }
}

const createWorker = async (params: WorkerCreationParams) => {
  const channel = params.channel || await createChannel();
  const worker = new Worker({ ...params, channel });
  await worker.init();
  return worker;
};

export interface SinkWorkerParams extends WorkerOptions {
  transport: Transport;
  consumer: MessageConsumer;
}

export const createSinkWorker = ({ transport, consumer, ...options }: SinkWorkerParams) =>
  createWorker({
    transportsToInit: [transport],
    transportToConsume: transport,
    options,
    messageConsumer: async (msg: ConsumeMessage, worker: Worker) => {
      try {
        await consumer(msg, worker);
      } catch (e) {
        console.error(`Processing msg from ${transport} failed`);
        console.error(`Message being processed was`, msg);
        console.error('Error caught is', e);
        throw e;
      }
    }
  });

export interface PipeWorkerParams extends WorkerOptions {
  from: Transport;
  to: Transport;
  consumer: MessageConsumer;
}

export const createPipeWorker = ({ from, to, consumer, ...options }: PipeWorkerParams) =>
  createWorker({
    transportsToInit: [from, to],
    transportToConsume: from,
    options,
    messageConsumer: async (msg, worker) => {
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
    }
  });

export const startWorker = async (jobType: string, createWorker: () => Worker | Promise<Worker>) => {
  try {
    const worker = await createWorker();
    await worker.start();
    await sendSystemEvent(new WorkerStarted(jobType, worker.workerName));
  } catch (e) {
    console.error('Caught error starting worker');
    console.error(e);
    process.exit(-1);
  }
};
