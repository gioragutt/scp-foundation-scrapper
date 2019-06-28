import { createSinkWorker, startWorker } from '../../lib/worker';
import redis from '../../lib/redis';
import { groupAndTime } from '../../lib/utils';

import { tagsKey, rawHtmlKey, tagsToScpsKey, ALL_TAGS_KEY } from '../../api/redisKeys';
import { SCP_HTML_EXTRACTED } from '../../api/transports';
import { PROCESS_SCP } from '../../api/jobs';

import { extractTags } from './extractTags';

const saveTags = async (id: string, tags: string[]) => {
  const scpTags = tagsKey(id);

  const pipeline = redis.pipeline();
  pipeline.del(scpTags);
  pipeline.sadd(scpTags, ...tags);
  tags.forEach(tag => pipeline.sadd(tagsToScpsKey(tag), id));
  pipeline.sadd(ALL_TAGS_KEY, ...tags);
  await pipeline.exec();
};

startWorker(PROCESS_SCP.jobType, () =>
  createSinkWorker({
    transport: SCP_HTML_EXTRACTED,
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
