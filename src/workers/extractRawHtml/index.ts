import { startWorker, createPipeWorker } from '../../lib/worker';
import { SCP_HTML_EXTRACTED } from '../../api/transports';
import redis from '../../lib/redis';
import { rawHtmlKey } from '../../api/redisKeys';
import { PROCESS_SCP } from '../../api/jobs';

import { extractRawHtml } from './extractRawHtml';

startWorker(PROCESS_SCP.jobType, () =>
  createPipeWorker({
    from: PROCESS_SCP.transport,
    to: SCP_HTML_EXTRACTED,
    consumer: async ({ content }) => {
      const url = JSON.parse(content.toString());
      const { id, html } = await extractRawHtml(url);
      await redis.set(rawHtmlKey(id), html);
      return id;
    },
  })
);
