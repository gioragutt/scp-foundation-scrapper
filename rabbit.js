const amqp = require('amqplib');
const { delay } = require('./utils');

const {
  rabbitmqHost,
  rabbitmqUser,
  rabbitmqPass,
  connectionAttempts,
  connectionRetryDelayMs,
} = require('./config');

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

let connection;
let channel;

async function createChannel() {
  if (!connection) {
    const amqpConnectionAddress = `amqp://${rabbitmqUser}:${rabbitmqPass}@${rabbitmqHost}`;
    console.log('Connecting to', amqpConnectionAddress);
    connection = await connectToRabbit(amqpConnectionAddress);
  }
  if (!channel) {
    console.log('Creating channel');
    channel = await connection.createChannel();
  }
  return channel;
}

module.exports = {
  createChannel,
};
