const {
  configs: { mapEnv },
} = require('@welldone-software/node-toolbelt');

export interface Config {
  rabbitmqHost: string;
  rabbitmqUser: string;
  rabbitmqPass: string;
  connectionAttempts: number;
  connectionRetryDelayMs: number;
  redisHost: string;
  apiHost: string;
  apiPort: number;
}

type RawConfig = {
  [key in keyof Config]: string;
};

const rawConfig: RawConfig = mapEnv({
  rabbitmqHost: 'localhost',
  rabbitmqUser: 'rabbitmq',
  rabbitmqPass: 'rabbitmq',
  connectionAttempts: '10',
  connectionRetryDelayMs: '1000',
  redisHost: 'localhost',
  apiHost: '0.0.0.0',
  apiPort: '3000',
});

export const config: Config = {
  ...rawConfig,
  connectionAttempts: Number.parseInt(rawConfig.connectionAttempts),
  connectionRetryDelayMs: Number.parseInt(rawConfig.connectionRetryDelayMs),
  apiPort: Number.parseInt(rawConfig.apiPort),
};
