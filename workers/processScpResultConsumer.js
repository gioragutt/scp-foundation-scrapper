const { basicWorker } = require('../lib/rabbit');
const processScp = require('../lib/processScp');

const RESULT_QUEUE_NAME = 'scp_process_result';

basicWorker([RESULT_QUEUE_NAME], RESULT_QUEUE_NAME, channel => async msg => {
  const result = JSON.parse(msg.content.toString());
  const title = result.find(s => s.title === 'Title #:');

  if (title) {
    console.log('Got title', title.content);
  } else {
    console.log('No title, full result is', result);
  }

  channel.ack(msg);
}).catch(console.error);
