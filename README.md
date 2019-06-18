# scp-foundation-scrapper

# Development

## Running the server

|                 command                 |       description        |
| :-------------------------------------: | :----------------------: |
|          `npm run buildImage`           | run after updating code  |
|         `docker-compose up -d`          | run after building image |
| `docker-compose logs -f <service name>` |  get logs of a service   |

## Implementation notes

- Workers should sit in `/workers`
- All redis keys (constants or creation methods) should sit in `redisKeys.js`
- All rabbitmq message names should sit in `messageNames.js`
