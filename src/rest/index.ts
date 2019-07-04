import express from 'express';
import { config } from '../config';
import { router } from './router';

const app = express();

app.use(express.json());
app.use(router);

app.listen(config.apiPort, config.apiHost, () =>
  console.log(`Server started ${config.apiHost}:${config.apiPort}`));