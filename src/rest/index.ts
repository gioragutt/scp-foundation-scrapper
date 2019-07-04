import express from 'express';
import { config } from '../config';
import { router } from './router';

const { expressHelpers: { errorHandler } } = require('@welldone-software/node-toolbelt');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(errorHandler);
app.use(router);

app.listen(config.apiPort, config.apiHost, () =>
  console.log(`Server started ${config.apiHost}:${config.apiPort}`));