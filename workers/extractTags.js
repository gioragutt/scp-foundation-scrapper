const { createSinkWorker, startWorker } = require('../lib/worker');
const redis = require('../lib/redis');
const { tagsKey, rawHtmlKey, tagsToScpsKey, ALL_TAGS_KEY } = require('../api/redisKeys');
const { SCP_HTML_EXTRACTED } = require('../api/messageNames');
const { groupAndTime } = require('../lib/utils');

const extractTags = require('../api/extractTags');

const saveTags = async (id, tags) => {
  const scpTags = tagsKey(id);

  const pipeline = redis.pipeline();
  pipeline.del(scpTags);
  pipeline.sadd(scpTags, ...tags);
  tags.forEach(tag => pipeline.sadd(tagsToScpsKey(tag), id));
  pipeline.sadd(ALL_TAGS_KEY, ...tags);
  await pipeline.exec();
};

startWorker(
  createSinkWorker({
    queue: SCP_HTML_EXTRACTED,
    consumer: async ({ content }, { workerTag }) => {
      const id = JSON.parse(content.toString());
      await groupAndTime(`${workerTag}: ${id}`, async () => {
        const html = await redis.get(rawHtmlKey(id));
        const tags = extractTags(html);
        await saveTags(id, tags);
        console.log('Extracted tags', tags);
      });
    },
  })
);
