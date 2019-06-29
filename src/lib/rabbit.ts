import { connect, Connection, Channel, Options } from 'amqplib';
import { delay } from './utils';
import { config } from '../config';
import { Transport } from './transports';

const {
  rabbitmqHost,
  rabbitmqUser,
  rabbitmqPass,
  connectionAttempts,
  connectionRetryDelayMs
} = config;

async function connectToRabbit(amqpConnectionAddress: string): Promise<Connection> {
  let attempt = 0;
  while (true) {
    try {
      const connection = await connect(amqpConnectionAddress);
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

function createCachedResource<T>(creator: () => Promise<T>): () => Promise<T> {
  let cachedResource: T;
  return async () => {
    if (!cachedResource) {
      cachedResource = await creator();
    }
    return cachedResource;
  };
}

const createConnection = createCachedResource(() => {
  const amqpConnectionAddress = `amqp://${rabbitmqUser}:${rabbitmqPass}@${rabbitmqHost}`;
  console.log('Connecting to', amqpConnectionAddress);
  return connectToRabbit(amqpConnectionAddress);
});

export const createChannel = createCachedResource(async () => {
  const connection = await createConnection();
  console.log('Creating channel');
  return connection.createChannel();
});

export const createConfirmChannel = createCachedResource(async () => {
  const connection = await createConnection();
  console.log('Creating channel');
  return connection.createConfirmChannel();
});

export function sendToTransport<T, O extends Options.Publish>(
  channel: Channel, transport: Transport, data: T, options: O = {} as O) {

  transport.send(channel, Buffer.from(JSON.stringify(data)), {
    persistent: true,
    ...options,
  });
}
