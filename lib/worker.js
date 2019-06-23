const { createChannel, sendToQueue } = require('./rabbit');
const { moduleName } = require('./utils');

const customHeaders = msg =>
  Object.entries(msg.properties.headers)
    .filter(([key]) => !key.startsWith('x-'))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

class Worker {
  constructor({ channel, queuesToAssert, queueToConsume, createConsumer, options = {} }) {
    this.channel = channel;
    this.queuesToAssert = queuesToAssert;
    this.queueToConsume = queueToConsume;
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

    console.log(`Starting ${this.workerTag} worker for ${this.queueToConsume}`);
    const { consumerTag } = await this.channel.consume(this.queueToConsume, this.consumer);
    console.log(`Worker ${this.workerTag} started, consumerTag='${consumerTag}'`);
    this.consumerTag = consumerTag;
  }

  async stop() {
    if (!this.consumerTag) {
      console.warn(
        `Stop called for ${this.workerTag} worker of ${this.queueToConsume} before starting it`
      );
      return;
    }

    console.log(
      `Stopping ${this.workerTag} worker of ${this.queueToConsume}, consumerTag=${this.consumerTag}`
    );
    await this.channel.cancel(this.consumerTag);
    this.consumerTag = null;
    console.log(`Worker ${this.workerTag} stopped`);
  }

  async init() {
    if (this.initialized) {
      return;
    }

    console.log(`Initializing ${this.workerTag} worker for ${this.queueToConsume}`);
    const queueAssertions = this.queuesToAssert.map(async queue => {
      if (typeof queue === 'string') {
        await this.channel.assertQueue(queue);
      } else if (typeof queue === 'object') {
        const { name, options } = queue;
        await this.channel.assertQueue(name, options);
      }
    });

    await Promise.all(queueAssertions);
    await this.channel.prefetch(1);
    this.initialized = true;
  }
}

const createWorker = async (queuesToAssert, queueToConsume, options, createConsumer) => {
  const channel = await createChannel();
  const worker = new Worker({
    channel,
    queuesToAssert,
    queueToConsume,
    createConsumer,
    options,
  });
  await worker.init();
  return worker;
};

const createSinkWorker = ({ queue, consumer, ...options }) =>
  createWorker([queue], queue, options, worker => async msg => {
    const { channel } = worker;
    try {
      await consumer(msg, worker);
      channel.ack(msg);
    } catch (e) {
      console.error(`Processing msg from ${queue} failed`);
      console.error(`Message being processed was`, msg);
      console.error('Error caught is', e);
      channel.reject(msg, false);
    }
  });

const createPipeWorker = ({ from: fromQueue, to: toQueue, consumer, ...options }) =>
  createWorker([fromQueue, toQueue], fromQueue, options, worker => async msg => {
    const { channel } = worker;
    try {
      const headers = customHeaders(msg);
      console.log('Got headers', headers);
      const response = await consumer(msg, worker);
      if (response) {
        sendToQueue(channel, toQueue, response, { headers });
      } else {
        console.warn(`Processing msg from ${fromQueue} returned falsy result, ignoring`);
      }
      channel.ack(msg);
    } catch (e) {
      console.error(`Processing msg from ${fromQueue} failed, not sending to ${toQueue}`);
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
