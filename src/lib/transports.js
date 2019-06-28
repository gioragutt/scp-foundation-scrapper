class Transport {
  constructor() {
    this.initialized = false;
    this.consumptionInitialized = false;
  }

  async init(channel) {
    if (this.initialized) {
      return;
    }
    await this.doInit(channel);
    this.initialized = true;
  }

  async doInit() {}

  async consumptionInit(channel) {
    if (this.consumptionInitialized) {
      return;
    }
    await this.doConsumptionInit(channel);
    this.consumptionInitialized = true;
  }

  async doConsumptionInit() {}
}

class ExchangeTransport extends Transport {
  constructor(exchangeName, exchangeType, options = { durable: true }) {
    super();
    this.exchangeName = exchangeName;
    this.exchangeType = exchangeType;
    this.options = options;
    this.queueName = null;
  }

  async doInit(channel) {
    await channel.assertExchange(this.exchangeName, this.exchangeType, this.options);
  }

  async doConsumptionInit(channel) {
    const { queue } = await channel.assertQueue('', { exclusive: true });
    this.queueName = queue;
    channel.bindQueue(this.queueName, this.exchangeName, '');
  }

  send(channel, buffer, { routingKey = '', ...options }) {
    channel.publish(this.exchangeName, routingKey, buffer, options);
  }

  toString() {
    return `${this.exchangeName}(${this.exchangeType})[${this.queueName}]`;
  }
}

const createExchange = (exchangeName, exchangeType, options) =>
  new ExchangeTransport(exchangeName, exchangeType, options);

class QueueTransport extends Transport {
  constructor(queueName, options = { durable: true }) {
    super();
    this.queueName = queueName;
    this.options = options;
  }

  async doInit(channel) {
    await channel.assertQueue(this.queueName, this.options);
  }

  send(channel, buffer, options) {
    channel.sendToQueue(this.queueName, buffer, options);
  }

  toString() {
    return this.queueName;
  }
}

const createQueue = (queueName, options) => new QueueTransport(queueName, options);

module.exports = {
  exchange: createExchange,
  queue: createQueue,
};
