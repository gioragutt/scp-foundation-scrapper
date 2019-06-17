const { basicWorker } = require('../lib/rabbit');
const processScp = require('../lib/processScp');

const REQUEST_QUEUE_NAME = 'scp_process_request';
const RESULT_QUEUE_NAME = 'scp_process_result';

basicWorker([REQUEST_QUEUE_NAME, RESULT_QUEUE_NAME], REQUEST_QUEUE_NAME, channel => async msg => {
  const url = msg.content.toString();
  console.log('Processing scp', url);
  try {
    const result = await processScp(url);
    console.log('Result for', url, result);

    channel.sendToQueue(RESULT_QUEUE_NAME, Buffer.from(JSON.stringify(result)), {
      persistent: true,
    });

    console.log('Sent result');

    channel.ack(msg);

    console.log('Sent ack');
  } catch (e) {
    console.log('Caught error processing', url);
    console.log('--------------------------------');
    console.error(e);
    console.log('--------------------------------');
  }
}).catch(console.error);
