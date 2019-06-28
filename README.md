# scp-foundation-scrapper

# Development

## Running the server

|                 command                 |              description               |
| :-------------------------------------: | :------------------------------------: |
|          `npm run buildImage`           |             rebuild image              |
|             `./restart.sh`              | rebuild image and restart all services |
| `docker-compose logs -f <service name>` |         get logs of a service          |

## Project Structure

    .
    ├── api                     # Logic, non-library related module
    │   ├── jobs.js             # Available job definitions
    │   ├── redisKeys.js        # common redis keys/key-getters
    │   └── transports.js       # transport definitions for workers
    │
    ├── lib                     # Library modules
    │   ├── jobs.js             # Job creation
    │   ├── jobTracking.js      # Job worker status tracking
    │   ├── rabbit.js           # RabbitMQ utilities and abstractions
    │   ├── redis.js            # 'ioredis' singleton export
    │   ├── transports.js       # RabbitMQ message routing abstraction
    │   ├── utils.js            # General utilities
    │   └── worker.js           # Worker library
    │
    ├── workers                 # Worker definitions
    │   ├── worker1             # Worker entry point and logic modules
    │   │   └── index.js
    │   └── workerN
    │       └── index.js
    │
    ├── config.js               # Export configuration to modules
    ├── docker-compose.yaml     # Services definition file (redis, rabbit, workers, etc)
    ├── test.js                 # Dummy file for testing code manually
    └── index.js                # Dummy file for starting jobs
