const { createChannel } = require('./lib/rabbit');
const { INITIAL_PROCESSING_REQUEST } = require('./api/messageNames');

async function main() {
  const channel = await createChannel();

  channel.assertQueue(INITIAL_PROCESSING_REQUEST);

  function sendScpProcessRequest(scp) {
    const url = `http://www.scp-wiki.net/scp-${scp.toString().padStart(3, '0')}`;
    console.log('Sending SCP processing request:', url);
    channel.sendToQueue(INITIAL_PROCESSING_REQUEST, Buffer.from(url));
  }
  sendScpProcessRequest(8);
  setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
