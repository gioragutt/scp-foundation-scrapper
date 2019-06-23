const { createChannel } = require('./lib/rabbit');
const { delay } = require('./lib/utils');
const { BEGIN_PROCESSING_SCP } = require('./api/messageNames');
const uuid = require('uuid');

async function main() {
  const channel = await createChannel();

  channel.assertQueue(BEGIN_PROCESSING_SCP);

  async function sendScpProcessRequest(scp) {
    await delay(1000);
    const url = `http://www.scp-wiki.net/scp-${scp.toString().padStart(3, '0')}`;
    console.log('Sending SCP processing request:', url);
    channel.sendToQueue(BEGIN_PROCESSING_SCP, Buffer.from(url), {
      headers: {
        tracingId: uuid(),
      },
    });
  }

  await Promise.all([3, 4, 5, 6, 7, 8].map(sendScpProcessRequest));
  setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
