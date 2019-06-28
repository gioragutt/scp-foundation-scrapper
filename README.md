# scp-foundation-scrapper

## Running the server

|                 command                 |              description               |
| :-------------------------------------: | :------------------------------------: |
|          `npm run buildImage`           |             rebuild image              |
|         `./scripts/restart.sh`          | rebuild image and restart all services |
| `docker-compose logs -f <service name>` |         get logs of a service          |
|        `./scripts/redis-cli.sh`         |        opens a redis-cli shell         |

## Project Structure

    src
    ├── scripts                 # Useful scripts
    │
    ├── api                     # Logic, non-library related module
    │   ├── constants.ts        # Shared constants
    │   ├── jobs.ts             # Available job definitions
    │   ├── redisKeys.ts        # common redis keys/key-getters
    │   └── transports.ts       # transport definitions for workers
    │
    ├── lib                     # Library modules
    │   ├── jobs.ts             # Job creation
    │   ├── jobTracking.ts      # Job worker status tracking
    │   ├── rabbit.ts           # RabbitMQ utilities and abstractions
    │   ├── redis.ts            # 'ioredis' singleton export
    │   ├── transports.ts       # RabbitMQ message routing abstraction
    │   ├── utils.ts            # General utilities
    │   └── worker.ts           # Worker library
    │
    ├── workers                 # Worker definitions
    │   ├── worker1             # Worker entry point and logic modules
    │   │   └── index.ts
    │   └── workerN
    │       └── index.ts
    │
    ├── config.ts               # Export configuration to modules
    ├── docker-compose.yaml     # Services definition file (redis, rabbit, workers, etc)
    ├── test.ts                 # Dummy file for testing code manually
    └── index.ts                # Dummy file for starting jobs
