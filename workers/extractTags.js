const { createSinkWorker, startWorker } = require('../lib/rabbit');
const redis = require('../lib/redis');
const { tagsKey, rawHtmlKey, tagsToScpsKey, ALL_TAGS_KEY } = require('../redisKeys');
const { INITIAL_PROCESSING_FINISHED } = require('../messageNames');

const extractTags = require('../lib/extractTags');

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
    consumer: async ({ content }) => {
      const id = content.toString();
      console.log('Extracting tags for', id);
      const html = await redis.get(rawHtmlKey(id));
      const tags = extractTags(html);
      await saveTags(id, tags);
    },
  })
);
