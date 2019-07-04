import { Router, Request, RequestHandler } from 'express';
import { allJobs, jobById, createJob } from '../api/jobs';

const {
  expressHelpers: { createApiEndpoint }
} = require('@welldone-software/node-toolbelt');

type ApiEndpointCreator = <T>(logic: (req: Request) => T | Promise<T>) => RequestHandler;
const _: ApiEndpointCreator = createApiEndpoint;

export const router = Router();

router.get(
  '/jobs',
  _(allJobs)
);

router.post(
  '/jobs',
  _(async ({ body: { definition, args } }) => {
    const jobId = await createJob(definition, args);
    return { jobId };
  })
);

router.get(
  '/jobs/:jobId',
  _(({ params: { jobId } }) => jobById(jobId))
);