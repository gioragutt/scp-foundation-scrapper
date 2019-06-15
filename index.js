const { createChannel } = require('./rabbit');

const { delay } = require('./utils');
const processScp = require('./processScp');

const QUEUE_NAME = 'scp_process_request';

async function main() {
  const channel = await createChannel();

  channel.assertQueue(QUEUE_NAME);

  channel.consume(QUEUE_NAME, async msg => {
    const url = msg.content.toString();
    console.log('Processing scp', url);
    const result = await processScp(url);
    console.log('Result for', url);
    const title = result.find(s => s.title === 'Title #:');
    if (title) {
      console.log('Got title', title.content);
    } else {
      console.log('No title, full result is', result);
    }
    channel.ack(msg);
  });

  for (let scp = 1; scp <= 5; scp++) {
    await delay(1000);
    const url = `http://www.scp-wiki.net/scp-${scp.toString().padStart(3, '0')}`;
    console.log('Sending SCP processing request:', url);
    channel.sendToQueue('scp_process_request', Buffer.from(url));
  }
}

main().catch(console.error);
