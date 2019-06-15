const {
  configs: { mapEnv },
} = require('@welldone-software/node-toolbelt');

const config = mapEnv({
  rabbitmqHost: 'localhost',
  rabbitmqUser: 'rabbitmq',
  rabbitmqPass: 'rabbitmq',
  connectionAttempts: '5',
  connectionRetryDelayMs: '1000',
});

const fixedConfig = {
  ...config,
  connectionAttempts: Number.parseInt(config.connectionAttempts),
  connectionRetryDelayMs: Number.parseInt(config.connectionRetryDelayMs),
};

module.exports = fixedConfig;
