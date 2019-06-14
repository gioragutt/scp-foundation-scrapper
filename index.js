const amqp = require('amqplib');

async function main() {
  const channel = await amqp
    .connect('amqp://rabbitmq:rabbitmq@localhost')
    .then(connection => connection.createChannel());

  channel.assertQueue('hello', {
    durable: false,
  });

  channel.consume(
    'hello',
    ({ content }) => {
      console.log('received content:', content.toString());
    },
    {
      noAck: true,
    }
  );

  let i = 0;
  setInterval(() => {
    channel.sendToQueue('hello', Buffer.from(`world ${i++}`));
  }, 1000);
}

main().catch(console.error);
