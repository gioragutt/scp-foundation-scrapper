import { Channel, Options } from 'amqplib';

export abstract class Transport {
  initialized: boolean = false;
  consumptionInitialized: boolean = false;

  constructor(public queueName: string) {
  }

  async init(channel: Channel): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.doInit(channel);
    this.initialized = true;
  }

  protected async doInit(channel: Channel): Promise<void> { }

  async consumptionInit(channel: Channel): Promise<void> {
    await this.init(channel);
    if (this.consumptionInitialized) {
      return;
    }
    await this.doConsumptionInit(channel);
    this.consumptionInitialized = true;
  }

  protected async doConsumptionInit(channel: Channel): Promise<void> { }

  abstract send(channel: Channel, buffer: Buffer, options: Options.Publish): void;
}

export interface ExchangeOptions {
  durable: boolean;
}

export type ExchangePublishOptions = Options.Publish & { routingKey: string };

class ExchangeTransport extends Transport {
  constructor(
    public exchangeName: string,
    public exchangeType: string,
    private options: ExchangeOptions = { durable: true }) {
    super(undefined);
  }

  async doInit(channel: Channel) {
    await channel.assertExchange(this.exchangeName, this.exchangeType, this.options);
  }

  async doConsumptionInit(channel: Channel) {
    const { queue } = await channel.assertQueue('', { exclusive: true });
    this.queueName = queue;
    channel.bindQueue(this.queueName, this.exchangeName, '');
  }

  send(channel: Channel, buffer: Buffer, { routingKey = '', ...options }: ExchangePublishOptions) {
    channel.publish(this.exchangeName, routingKey, buffer, options);
  }

  toString() {
    return `${this.exchangeName}(${this.exchangeType})[${this.queueName}]`;
  }
}

export const exchange = (exchangeName: string, exchangeType: string, options?: ExchangeOptions): Transport =>
  new ExchangeTransport(exchangeName, exchangeType, options);

export interface QueueTransportOptions {
  durable: boolean;
}

class QueueTransport extends Transport {
  constructor(queueName: string, private options: QueueTransportOptions = { durable: true }) {
    super(queueName);
  }

  async doInit(channel: Channel) {
    await channel.assertQueue(this.queueName, this.options);
  }

  send(channel: Channel, buffer: Buffer, options: Options.Publish) {
    channel.sendToQueue(this.queueName, buffer, options);
  }

  toString() {
    return this.queueName;
  }
}

export const queue = (queueName: string, options?: QueueTransportOptions): Transport =>
  new QueueTransport(queueName, options);

