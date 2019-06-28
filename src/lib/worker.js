const { createChannel, sendToTransport } = require('./rabbit');
const { moduleName } = require('./utils');
const jobTracking = require('./jobTracking');

const messageHeaders = msg =>
  Object.entries(msg.properties.headers)
    .filter(([key]) => !key.startsWith('x-'))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

const getJobId = msg => messageHeaders(msg)[jobTracking.JOB_ID];

const wrapConsumerMethod = (worker, createConsumer) => {
  const consumer = createConsumer(worker);

  return async msg => {
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

class Worker {
  constructor({ channel, transportsToInit, transportsToConsume, createConsumer, options = {} }) {
    this.channel = channel;
    this.transportsToInit = transportsToInit;
    this.transportToConsume = transportsToConsume;
    this.consumer = wrapConsumerMethod(this, createConsumer);
    this.consumerTag = null;
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
    this.consumerTag = null;
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

const createWorker = async (transportsToInit, transportsToConsume, options, createConsumer) => {
  const channel = await createChannel();
  const worker = new Worker({
    channel,
    transportsToInit,
    transportsToConsume,
    createConsumer,
    options,
  });
  await worker.init();
  return worker;
};

const createSinkWorker = ({ transport, consumer, ...options }) =>
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

const createPipeWorker = ({ from, to, consumer, ...options }) =>
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

const startWorker = async (jobType, createWorker) => {
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

module.exports = {
  createSinkWorker,
  createPipeWorker,
  startWorker,
  getJobId,
};
