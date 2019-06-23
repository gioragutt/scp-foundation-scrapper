class ExchangeTransport {
  constructor(exchangeName, exchangeType, options = { durable: true }) {
    this.exchangeName = exchangeName;
    this.exchangeType = exchangeType;
    this.options = options;
    this.queueName = null;
  }

  async init(channel) {
    await channel.assertExchange(this.exchangeName, this.exchangeType, this.options);
  }

  async initConsumption(channel) {
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

class QueueTransport {
  constructor(queueName, options = { durable: true }) {
    this.queueName = queueName;
    this.options = options;
  }

  async init(channel) {
    await channel.assertQueue(this.queueName, this.options);
  }

  async initConsumption() {}

  send(channel, buffer, options) {
    channel.sendToQueue(this.queueName, buffer, options);
  }

  toString() {
    return this.queueName;
  }
}

const createQueue = (queueName, options) => new QueueTransport(queueName, options);

module.exports = {
  createExchange,
  createQueue,
};
