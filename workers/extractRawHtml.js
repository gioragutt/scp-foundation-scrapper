const { startWorker, createPipeWorker } = require('../lib/worker');
const { BEGIN_PROCESSING_SCP, SCP_HTML_EXTRACTED } = require('../api/transports');
const extractRawHtml = require('../api/extractRawHtml');
const redis = require('../lib/redis');
const { rawHtmlKey } = require('../api/redisKeys');
const {
  PROCESS_SCP: { jobType },
} = require('../api/jobs');

startWorker(jobType, () =>
  createPipeWorker({
    from: BEGIN_PROCESSING_SCP,
    to: SCP_HTML_EXTRACTED,
    consumer: async ({ content }) => {
      const url = JSON.parse(content.toString());
      const { id, html } = await extractRawHtml(url);
      await redis.set(rawHtmlKey(id), html);
      return id;
    },
  })
);
