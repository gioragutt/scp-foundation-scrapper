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

const sendToTransport = (channel, transport, data, options = {}) =>
  transport.send(channel, Buffer.from(JSON.stringify(data)), {
    persistent: true,
    ...options,
  });

module.exports = {
  createChannel,
  sendToTransport,
};
