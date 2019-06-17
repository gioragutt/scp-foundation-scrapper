const { createChannel } = require('./rabbit');
const { delay } = require('./utils');

const QUEUE_NAME = 'scp_process_request';

async function main() {
  const channel = await createChannel();

  channel.assertQueue(QUEUE_NAME);

  function sendScpProcessRequest(scp) {
    const url = `http://www.scp-wiki.net/scp-${scp.toString().padStart(3, '0')}`;
    console.log('Sending SCP processing request:', url);
    channel.sendToQueue('scp_process_request', Buffer.from(url));
  }
  sendScpProcessRequest(8);

  // for (let scp = 2; scp <= 2; scp++) {
  //   await delay(1000);
  //   sendScpProcessRequest(scp);
  // }
}

main().catch(console.error);
