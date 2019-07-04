import { createSinkWorker, startWorker } from '../../lib/worker';

import redis from '../../lib/redis';
import { groupAndTime } from '../../lib/utils';

import { SCP_HTML_EXTRACTED } from '../../api/transports';
import { relatedScpsKey, rawHtmlKey } from '../../api/redisKeys';
import { PROCESS_SCP } from '../../api/jobDefinitions';

import { extractRelatedScps } from './extractRelatedScps';

startWorker(PROCESS_SCP.jobType, () =>
  createSinkWorker({
    transport: SCP_HTML_EXTRACTED,
    consumer: async ({ content }, { workerTag }) => {
      const id = JSON.parse(content.toString());
      return groupAndTime(`${workerTag}: ${id}`, async () => {
        const html = await redis.get(rawHtmlKey(id));
        const relatedScps = extractRelatedScps(html);
        await redis.set(relatedScpsKey(id), JSON.stringify(relatedScps));
        console.log('Extracted related scps:', relatedScps);
      });
    },
  })
);
