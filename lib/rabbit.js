const amqp = require('amqplib');
const { delay } = require('./utils');

const {
  rabbitmqHost,
  rabbitmqUser,
  rabbitmqPass,
  connectionAttempts,
  connectionRetryDelayMs,
} = require('../config');

async function connectToRabbit(amqpConnectionAddress) {
  let attempt = 0;
  while (true) {
    try {
      const connection = await amqp.connect(amqpConnectionAddress);
      console.log('Connected successfully!');
      return connection;
    } catch (e) {
      if (attempt === connectionAttempts) {
        throw e;
      }
      console.error(`Failed ${attempt + 1} times, retrying`);
      await delay(connectionRetryDelayMs);
      attempt++;
    }
  }
}

const createCachedResource = creator => {
  let cachedResource;
  return async () => {
    if (!cachedResource) {
      cachedResource = await creator();
    }
    return cachedResource;
  };
};

const createConnection = createCachedResource(() => {
  const amqpConnectionAddress = `amqp://${rabbitmqUser}:${rabbitmqPass}@${rabbitmqHost}`;
  console.log('Connecting to', amqpConnectionAddress);
  return connectToRabbit(amqpConnectionAddress);
});

const createChannel = createCachedResource(async () => {
  const connection = await createConnection();
  console.log('Creating channel');
  return connection.createChannel();
});

class Worker {
  constructor({ channel, queuesToAssert, queueToConsume, createConsumer }) {
    this.channel = channel;
    this.queuesToAssert = queuesToAssert;
    this.queueToConsume = queueToConsume;
    this.consumer = createConsumer(this.channel);
    this.consumerTag = null;
    this.initialized = false;
  }

  async start() {
    if (!this.initialized) {
      await this.init();
    }

    console.log(`Starting worker for ${this.queueToConsume}`);
    const { consumerTag } = await this.channel.consume(this.queueToConsume, this.consumer);
    console.log(`Worker started, consumerTag='${consumerTag}'`);
    this.consumerTag = consumerTag;
  }

  async stop() {
    if (!this.consumerTag) {
      console.warn(`Stop called for worker of ${this.queueToConsume} before starting it`);
      return;
    }

    console.log(`Stopping worker of ${this.queueToConsume}, consumerTag=${this.consumerTag}`);
    await this.channel.cancel(this.consumerTag);
    this.consumerTag = null;
    console.log('Worker stopped');
  }

  async init() {
    if (this.initialized) {
      return;
    }

    console.log(`Initializing worker for ${this.queueToConsume}`);
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

const createWorker = async (queuesToAssert, queueToConsume, createConsumer) => {
  const channel = await createChannel();
  const worker = new Worker({
    channel,
    queuesToAssert,
    queueToConsume,
    createConsumer,
  });
  await worker.init();
  return worker;
};

const sendToQueue = (channel, queue, data) =>
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
    persistent: true,
  });

const createSinkWorker = ({ queue, consumer }) =>
  createWorker([queue], queue, channel => async msg => {
    try {
      await consumer(msg);
      channel.ack(msg);
    } catch (e) {
      console.error(`Processing msg from ${queue} failed`);
      console.error(`Message being processed was`, msg);
      console.error('Error caught is', e);
      channel.reject(msg, false);
    }
  });

const createPipeWorker = ({ from: fromQueue, to: toQueue, consumer }) =>
  createWorker([fromQueue, toQueue], fromQueue, channel => async msg => {
    try {
      const response = await consumer(msg);
      if (response) {
        sendToQueue(channel, toQueue, response);
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
  createChannel,
  createSinkWorker,
  createPipeWorker,
  sendToQueue,
  startWorker,
};
