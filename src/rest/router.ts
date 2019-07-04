import { Router, Request, RequestHandler } from 'express';
import { allJobs, jobById } from '../api/jobs';

const {
  expressHelpers: { createApiEndpoint }
} = require('@welldone-software/node-toolbelt');

type ApiEndpointCreator = <T>(logic: (req: Request) => T | Promise<T>) => RequestHandler;
const _: ApiEndpointCreator = createApiEndpoint;

export const router = Router();

router.get(
  '/jobs',
  _(() => allJobs())
);

router.get(
  '/jobs/:jobId',
  _(({ params: { jobId } }) => jobById(jobId))
);