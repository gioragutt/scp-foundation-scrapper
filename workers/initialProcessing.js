const { createPipeWorker, startWorker } = require('../lib/worker');
const redis = require('../lib/redis');
const processScp = require('../lib/processScp');
const { INITIAL_PROCESSING_REQUEST, INITIAL_PROCESSING_FINISHED } = require('../messageNames');
const { initialProcessingResultKey, rawHtmlKey } = require('../redisKeys');

const saveInitialProcessingResult = async ({ id, initialProcessingResult, scpHtml }) => {
  await redis.set(rawHtmlKey(id), scpHtml);
  await redis.set(initialProcessingResultKey(id), JSON.stringify(initialProcessingResult));
};

startWorker(
  createPipeWorker({
    from: INITIAL_PROCESSING_REQUEST,
    to: INITIAL_PROCESSING_FINISHED,
    consumer: async ({ content }) => {
      const url = content.toString();
      console.log('Started processing', url);
      const result = await processScp(url);
      await saveInitialProcessingResult(result);
      console.log('Finished processing', url);
      return result.id;
    },
  })
);
