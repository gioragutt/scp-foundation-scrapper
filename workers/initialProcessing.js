const { basicWorker } = require('../lib/rabbit');
const redis = require('../lib/redis');
const processScp = require('../lib/processScp');
const { INITIAL_PROCESSING_REQUEST, INITIAL_PROCESSING_FINISHED } = require('../messageNames');
const { initialProcessingResultKey, rawHtmlKey } = require('../redisKeys');

const saveInitialProcessingResult = async ({ id, initialProcessingResult, scpHtml }) => {
  await redis.set(rawHtmlKey(id), scpHtml);
  await redis.set(initialProcessingResultKey(id), JSON.stringify(initialProcessingResult));
};

basicWorker(
  [INITIAL_PROCESSING_REQUEST, INITIAL_PROCESSING_FINISHED],
  INITIAL_PROCESSING_REQUEST,
  channel => async msg => {
    const url = msg.content.toString();
    console.log('Started processing', url);
    try {
      const result = await processScp(url);
      await saveInitialProcessingResult(result);

      channel.sendToQueue(INITIAL_PROCESSING_FINISHED, Buffer.from(result.id), {
        persistent: true,
      });
      channel.ack(msg);

      console.log('Finished processing', url);
    } catch (e) {
      console.log('Caught error while processing', url);
      console.log('--------------------------------');
      console.error(e);
      console.log('--------------------------------');
    }
  }
).catch(console.error);
