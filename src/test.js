// const processScp = require('./lib/processScp');
// const url = 'http://www.scp-wiki.net/scp-003';

// // const content =
// //   ': SCP-500 has been found to be able to completely cure SCP-008 even in the advanced stages of the disease. « SCP-007 | SCP-008 | SCP-009 »';
// // const ITEM_NUMBER_REGEX = /SswdsCP-[0-9]{3,4}/g;
// // console.log(content.match(ITEM_NUMBER_REGEX));

// (async function main() {
//   const result = await processScp(url);
//   console.log(result);
// })().catch(console.error);
const redis = require('./lib/redis');

(async function main() {
  console.log(await redis.smembers('SCP-003-tags'));
})().catch(console.error);
