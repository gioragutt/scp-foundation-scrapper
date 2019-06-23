const { startWorker, createPipeWorker } = require('../lib/worker');
const { BEGIN_PROCESSING_SCP, SCP_HTML_EXTRACTED } = require('../api/messageNames');
const extractRawHtml = require('../api/extractRawHtml');
const redis = require('../lib/redis');
const { rawHtmlKey } = require('../api/redisKeys');

startWorker(
  createPipeWorker({
    from: BEGIN_PROCESSING_SCP,
    to: SCP_HTML_EXTRACTED,
    consumer: async ({ content }) => {
      const url = content.toString();
      const { id, html } = await extractRawHtml(url);
      await redis.set(rawHtmlKey(id), html);
      return id;
    },
  })
);
