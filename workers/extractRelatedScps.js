const { createSinkWorker, startWorker } = require('../lib/worker');
const redis = require('../lib/redis');
const { groupAndTime } = require('../lib/utils');

const extractRelatedScps = require('../api/extractRelatedScps');
const { SCP_HTML_EXTRACTED } = require('../api/messageNames');
const { relatedScpsKey, rawHtmlKey } = require('../api/redisKeys');

startWorker(
  createSinkWorker({
    queue: SCP_HTML_EXTRACTED,
    consumer: async ({ content }, { workerTag }) => {
      const id = JSON.parse(content.toString());
      return groupAndTime(`${workerTag}: ${id}`, async () => {
        const html = await redis.get(rawHtmlKey(id));
        const relatedScps = await extractRelatedScps(html);
        await redis.set(relatedScpsKey(id), JSON.stringify(relatedScps));
        console.log('Extracted related scps:', relatedScps);
      });
    },
  })
);
