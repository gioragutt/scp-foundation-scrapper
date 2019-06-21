const { createSinkWorker, startWorker } = require('../lib/worker');
const redis = require('../lib/redis');
const { tagsKey, rawHtmlKey, tagsToScpsKey, ALL_TAGS_KEY } = require('../api/redisKeys');
const { INITIAL_PROCESSING_FINISHED } = require('../api/messageNames');
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
    queue: INITIAL_PROCESSING_FINISHED,
    consumer: async ({ content }, { workerTag }) => {
      const scpId = JSON.parse(content.toString());
      const label = `${workerTag} ${scpId}`;
      await groupAndTime(label, async () => {
        const html = await redis.get(rawHtmlKey(scpId));
        const tags = extractTags(html);
        await saveTags(scpId, tags);
        console.log('Extracted tags', tags);
      });
    },
  })
);
