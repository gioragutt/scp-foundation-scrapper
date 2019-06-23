const { createChannel, sendToTransport } = require('./rabbit');
const { moduleName } = require('./utils');

const customHeaders = msg =>
  Object.entries(msg.properties.headers)
    .filter(([key]) => !key.startsWith('x-'))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

class Worker {
  constructor({ channel, transportsToInit, transportsToConsume, createConsumer, options = {} }) {
    this.channel = channel;
    this.transportsToInit = transportsToInit;
    this.transportToConsume = transportsToConsume;
    this.consumer = createConsumer(this);
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
    await this.transportToConsume.initConsumption(this.channel);
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
    const { channel } = worker;
    try {
      await consumer(msg, worker);
      channel.ack(msg);
    } catch (e) {
      console.error(`Processing msg from ${transport} failed`);
      console.error(`Message being processed was`, msg);
      console.error('Error caught is', e);
      channel.reject(msg, false);
    }
  });

const createPipeWorker = ({ from, to, consumer, ...options }) =>
  createWorker([from, to], from, options, worker => async msg => {
    const { channel } = worker;
    try {
      const headers = customHeaders(msg);
      console.log('Got headers', headers);
      const response = await consumer(msg, worker);
      if (response) {
        sendToTransport(channel, to, response, { headers });
      } else {
        console.warn(`Processing msg from ${from} returned falsy result, ignoring`);
      }
      channel.ack(msg);
    } catch (e) {
      console.error(`Processing msg from ${from} failed, not sending to ${to}`);
      console.error(`Message being processed was`, msg);
      console.error('Error caught is', e);
      channel.reject(msg, false);
    }
  });

const startWorker = workerPromise =>
  Promise.resolve()
    .then(() => workerPromise)
    .then(worker => worker.start())
    .catch(console.error);

module.exports = {
  createSinkWorker,
  createPipeWorker,
  startWorker,
};
